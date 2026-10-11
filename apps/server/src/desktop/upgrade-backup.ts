import { backup, DatabaseSync } from "node:sqlite";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

/** Runs after acquiring the device lock and before starting PocketBase/migrations.
 * SQLite's backup API creates coherent DB snapshots even when an old WAL exists. */
export async function prepareUpgradeBackup(
  dataDir: string,
  fingerprint: string,
): Promise<string | undefined> {
  const statePath = join(dataDir, "release-state.json");
  let previous: { fingerprint: string } | undefined;
  try {
    previous = JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (previous?.fingerprint === fingerprint) return;
  const databaseDir = join(dataDir, "pb_data");
  try {
    await stat(join(databaseDir, "data.db"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  const target = join(dataDir, "backups", `before-upgrade-${Date.now()}`);
  const staging = `${target}.partial`;
  await mkdir(staging, { recursive: true, mode: 0o700 });
  try {
    await cp(databaseDir, join(staging, "pb_data"), {
      recursive: true,
      filter: (path) => !/\.db(?:-wal|-shm)?$/.test(path),
    });
    for (const entry of await readdir(databaseDir)) {
      if (!entry.endsWith(".db")) continue;
      const db = new DatabaseSync(join(databaseDir, entry), { readOnly: true });
      try {
        await backup(db, join(staging, "pb_data", entry));
      } finally {
        db.close();
      }
    }
    for (const entry of ["local-identity.json", "release-state.json"]) {
      try {
        await cp(join(dataDir, entry), join(staging, entry));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    await writeFile(
      join(staging, "backup.json"),
      JSON.stringify({
        from: previous?.fingerprint ?? "legacy",
        to: fingerprint,
        createdAt: new Date().toISOString(),
      }),
      { mode: 0o600 },
    );
    await rename(staging, target);
    return target;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw new Error(
      "Upgrade backup failed; database migration has not started",
      { cause: error },
    );
  }
}
export async function commitReleaseState(
  dataDir: string,
  fingerprint: string,
): Promise<void> {
  const target = join(dataDir, "release-state.json");
  await writeFile(`${target}.tmp`, JSON.stringify({ fingerprint }), {
    mode: 0o600,
  });
  await rename(`${target}.tmp`, target);
}
