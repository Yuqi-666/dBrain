import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  containerMatrix,
  containerRunners,
  desktopMatrix,
  desktopRunners,
  selectTargets,
} from "./platforms.mjs";

const desktop = ["linux-x64", "win32-x64", "darwin-x64", "darwin-arm64"];
const containers = ["linux/amd64", "linux/arm64"];

test("a selection keeps the order of the list in release.json", () => {
  assert.deepEqual(selectTargets("all", desktop, "desktop target"), desktop);
  assert.deepEqual(selectTargets("", desktop, "desktop target"), desktop);
  assert.deepEqual(selectTargets(" linux-x64 ", desktop, "desktop target"), [
    "linux-x64",
  ]);
  assert.deepEqual(
    selectTargets("darwin-arm64,linux-x64", desktop, "desktop target"),
    ["linux-x64", "darwin-arm64"],
  );
});

test("a selection outside the list in release.json is refused", () => {
  assert.throws(
    () => selectTargets("linux-x64,solaris-x64", desktop, "desktop target"),
    /Unknown desktop target "solaris-x64"/,
  );
  assert.throws(
    () => selectTargets("linux-x64,linux-x64", desktop, "desktop target"),
    /repeats a name/,
  );
  assert.throws(
    () => selectTargets(",", desktop, "desktop target"),
    /selection is empty/,
  );
});

test("a matrix holds one runner for every selected name", () => {
  assert.deepEqual(desktopMatrix(["darwin-arm64"]), [
    { os: "macos-15", target: "darwin-arm64" },
  ]);
  assert.deepEqual(
    desktopMatrix(desktop).map((entry) => entry.target),
    desktop,
  );
  assert.deepEqual(containerMatrix(containers), [
    { os: "ubuntu-22.04", arch: "amd64" },
    { os: "ubuntu-24.04-arm", arch: "arm64" },
  ]);
});

test("every platform in release.json names a runner", async () => {
  const release = JSON.parse(
    await readFile(
      fileURLToPath(new URL("./release.json", import.meta.url)),
      "utf8",
    ),
  );
  assert.deepEqual(
    Object.keys(desktopRunners).sort(),
    [...release.desktopTargets].sort(),
  );
  assert.deepEqual(
    Object.keys(containerRunners).sort(),
    [...release.containerPlatforms].sort(),
  );
});
