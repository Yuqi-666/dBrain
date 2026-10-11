/** Start the same migrations/hooks used by containers; keep local data in pb/pb_data. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const binary = join(
  root,
  "pb",
  process.platform === "win32" ? "pocketbase.exe" : "pocketbase",
);
const child = spawn(
  binary,
  [
    "serve",
    `--http=${process.env.DBRAIN_PB_HTTP ?? "127.0.0.1:8090"}`,
    `--dir=${resolve(process.env.DBRAIN_PB_DATA_DIR ?? join(root, "pb/pb_data"))}`,
    `--migrationsDir=${join(root, "pb/pb_migrations")}`,
    `--hooksDir=${join(root, "pb/pb_hooks")}`,
    "--automigrate=0",
  ],
  { stdio: "inherit", cwd: root },
);
child.on("error", (error) => {
  console.error(
    `PocketBase could not start: ${error.message}. Run node scripts/release/download-pocketbase.mjs first.`,
  );
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 143);
});
