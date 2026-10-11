import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => readFile(resolve(root, path), "utf8");
const json = async (path) => JSON.parse(await read(path));
export async function checkRelease(tag) {
  const release = await json("scripts/release/release.json");
  assert.match(
    release.version,
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/,
  );
  for (const file of [
    "apps/desktop/package.json",
    "apps/desktop/src-tauri/tauri.conf.json",
  ])
    assert.equal(
      (await json(file)).version,
      release.version,
      `${file} version drift`,
    );
  assert.equal(
    (await read("apps/desktop/src-tauri/Cargo.toml")).match(
      /^version = "(.+)"$/m,
    )?.[1],
    release.version,
    "Cargo version drift",
  );
  assert.equal(
    (await read("apps/desktop/src-tauri/Cargo.lock")).match(
      /\[\[package\]\]\nname = "app"\nversion = "(.+)"/,
    )?.[1],
    release.version,
    "Cargo.lock version drift",
  );
  const config = await json("apps/desktop/src-tauri/tauri.conf.json");
  assert.ok(config.app.security.csp, "Desktop CSP must not be disabled");
  assert.equal(
    config.identifier,
    "cn.dbrain.desktop",
    "Changing identifier relocates existing user data",
  );
  assert.equal((await json("package.json")).packageManager, "pnpm@9.0.0");
  const node = (await read(".node-version")).trim();
  for (const file of ["apps/web/Dockerfile", "apps/server/Dockerfile"])
    assert.ok(
      (await read(file)).includes(`node:${node}-`),
      `${file} Node version drift`,
    );
  const lock = await json("scripts/release/pocketbase-lock.json");
  assert.ok(
    (await read("deploy/pocketbase/Dockerfile")).includes(`/v${lock.version}/`),
    "PocketBase version drift",
  );
  for (const arch of ["amd64", "arm64"])
    assert.ok(
      (await read("deploy/pocketbase/Dockerfile")).includes(
        lock.sha256[`pocketbase_${lock.version}_linux_${arch}.zip`],
      ),
      "PocketBase checksum drift",
    );
  assert.ok(
    (await read("LICENSE")).includes("All rights reserved."),
    "Distribution license missing",
  );
  if (tag)
    assert.equal(
      tag,
      `v${release.version}`,
      "Release tag must match product version",
    );
  return release.version;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(
    `Release source checks passed: ${await checkRelease(process.argv.find((arg) => arg.startsWith("--tag="))?.slice(6))}`,
  );
}
