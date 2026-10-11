import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareUpgradeBackup, commitReleaseState } from "./upgrade-backup.ts";
test("upgrade snapshots a WAL database, attachments and identity; repeat launch does not back up again", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dbrain-upgrade-test-"));
  let db: DatabaseSync | undefined;
  try {
    assert.equal(await prepareUpgradeBackup(dir, "v1"), undefined);
    await mkdir(join(dir, "pb_data/storage"), { recursive: true });
    db = new DatabaseSync(join(dir, "pb_data/data.db"));
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE fixture (value TEXT); INSERT INTO fixture VALUES ('preserved')");
    await writeFile(join(dir, "pb_data/storage/file.txt"), "attachment");
    await writeFile(join(dir, "local-identity.json"), '{"identity":"same"}');
    await commitReleaseState(dir, "v1");
    const target = await prepareUpgradeBackup(dir, "v2"); assert.ok(target);
    const snapshot = new DatabaseSync(join(target, "pb_data/data.db"), { readOnly: true });
    assert.equal(snapshot.prepare("SELECT value FROM fixture").get()!.value, "preserved"); snapshot.close();
    assert.equal(await readFile(join(target, "pb_data/storage/file.txt"), "utf8"), "attachment");
    assert.equal(await readFile(join(target, "local-identity.json"), "utf8"), '{"identity":"same"}');
    await commitReleaseState(dir, "v2");
    assert.equal(await prepareUpgradeBackup(dir, "v2"), undefined);
  } finally { db?.close(); await rm(dir, { recursive: true, force: true }); }
});
