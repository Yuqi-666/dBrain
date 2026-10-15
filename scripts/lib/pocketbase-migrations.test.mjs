import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareMigrations } from "./pocketbase-migrations.mjs";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

test("new databases run their base and only later changes; legacy databases run change history", async () => {
  const root = await mkdtemp(join(tmpdir(), "dbrain-migrations-"));
  const baseDir = join(root, "base"), changesDir = join(root, "changes");
  await mkdir(baseDir); await mkdir(changesDir);
  await writeFile(join(baseDir, "2100000000_base.js"), "base v1");
  await writeFile(join(changesDir, "1700000000_initial.js"), "initial");
  const fresh = { dataDir: join(root, "fresh"), baseDir, changesDir, runDir: join(root, "fresh-run") };
  const old = { dataDir: join(root, "old"), baseDir, changesDir, runDir: join(root, "old-run") };
  try {
    await prepareMigrations(fresh);
    assert.deepEqual((await readdir(fresh.runDir)).filter((name) => name.endsWith(".js")), ["2100000000_base.js"]);
    await writeFile(join(baseDir, "2100000000_base.js"), "base v2");
    await writeFile(join(changesDir, "2200000000_next.js"), "next");
    await prepareMigrations(fresh);
    assert.equal(await readFile(join(fresh.runDir, "2100000000_base.js"), "utf8"), "base v1");
    assert.ok((await readdir(fresh.runDir)).includes("2200000000_next.js"));
    await mkdir(old.dataDir);
    await writeFile(join(old.dataDir, "data.db"), "existing database marker");
    await prepareMigrations(old);
    assert.deepEqual((await readdir(old.runDir)).filter((name) => name.endsWith(".js")).sort(), ["1700000000_initial.js", "2200000000_next.js"]);
    await writeFile(join(changesDir, "2200000000_next.js"), "rewritten history");
    await assert.rejects(prepareMigrations(old), /Installed migration changed/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("PocketBase opens both the current base and an upgraded historical database", async () => {
  const repo = fileURLToPath(new URL("../../", import.meta.url));
  const root = await mkdtemp(join(tmpdir(), "dbrain-pb-upgrade-"));
  const binary = join(repo, "pb", process.platform === "win32" ? "pocketbase.exe" : "pocketbase");
  const baseDir = join(repo, "pb/pb_migrations_base"), changesDir = join(repo, "pb/pb_migrations_changes");
  const migrate = (dataDir, runDir) => {
    const result = spawnSync(binary, ["migrate", "up", `--dir=${dataDir}`, `--migrationsDir=${runDir}`, "--automigrate=0"], { encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  };
  try {
    const fresh = { dataDir: join(root, "fresh"), runDir: join(root, "fresh-run"), baseDir, changesDir };
    await prepareMigrations(fresh);
    migrate(fresh.dataDir, fresh.runDir);
    const old = { dataDir: join(root, "old"), runDir: join(root, "old-run"), baseDir, changesDir };
    migrate(old.dataDir, changesDir);
    const before = new DatabaseSync(join(old.dataDir, "data.db"), { readOnly: true });
    const oldCount = before.prepare("select count(*) as count from _migrations").get().count;
    before.close();
    await prepareMigrations(old);
    migrate(old.dataDir, old.runDir);
    const database = new DatabaseSync(join(old.dataDir, "data.db"), { readOnly: true });
    const after = database.prepare("select count(*) as count from _migrations").get().count;
    assert.equal(after, oldCount);
    const freshDb = new DatabaseSync(join(fresh.dataDir, "data.db"), { readOnly: true });
    const schema = (db) => {
      const rows = db.prepare("select id, name, type, fields, indexes, listRule, viewRule, createRule, updateRule, deleteRule from _collections order by name").all();
      const names = new Map(rows.map((row) => [row.id, row.name]));
      return rows.filter((row) => !row.name.startsWith("_")).map(({ id, ...row }) => ({
        ...row,
        fields: JSON.parse(row.fields).map(({ id: fieldId, ...field }) => ({
          ...field,
          ...(field.collectionId ? { collectionId: names.get(field.collectionId) } : {}),
        })),
      }));
    };
    assert.deepEqual(schema(freshDb), schema(database));
    const names = freshDb.prepare("select name from _collections").all().map((row) => row.name);
    assert.ok(names.includes("dashboard_configs"));
    assert.ok(names.includes("edge_semantics"));
    freshDb.close();
    database.close();
  } finally { await rm(root, { recursive: true, force: true }); }
});
