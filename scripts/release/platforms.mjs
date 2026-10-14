// The build targets of the release candidate.
//
// `scripts/release/release.json` holds the targets that a release may hold. A
// person selects a subset when the candidate starts. The selection must stay
// inside that list, so a start cannot invent a target or a runner.
//
// The file is data and functions only. The workflow `desktop-build.yml` and
// the workflow `container-build.yml` read the matrix from here.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const everyTarget = "all";

/** The runner that builds each desktop target. */
export const desktopRunners = {
  "linux-x64": "ubuntu-22.04",
  "win32-x64": "windows-2022",
  "darwin-x64": "macos-15-intel",
  "darwin-arm64": "macos-15",
};

/** The runner that builds each container platform. */
export const containerRunners = {
  "linux/amd64": { arch: "amd64", os: "ubuntu-22.04" },
  "linux/arm64": { arch: "arm64", os: "ubuntu-24.04-arm" },
};

/**
 * Reads a selection.
 *
 * The text `all` or an empty text selects every allowed name. A comma-separated
 * list selects those names. The result keeps the order of `allowed`.
 */
export function selectTargets(spec, allowed, label) {
  const text = typeof spec === "string" ? spec.trim() : "";
  if (text === "" || text === everyTarget) return [...allowed];
  const wanted = text
    .split(",")
    .map(item => item.trim())
    .filter(item => item !== "");
  assert.ok(wanted.length > 0, `The ${label} selection is empty.`);
  for (const item of wanted) {
    assert.ok(
      allowed.includes(item),
      `Unknown ${label} "${item}". The allowed names are ${allowed.join(", ")}.`,
    );
  }
  const unique = [...new Set(wanted)];
  assert.equal(
    unique.length,
    wanted.length,
    `The ${label} selection repeats a name.`,
  );
  return allowed.filter(item => unique.includes(item));
}

/** The matrix of the workflow `desktop-build.yml`. */
export function desktopMatrix(targets) {
  return targets.map(target => {
    const os = desktopRunners[target];
    assert.ok(os, `No runner is known for the desktop target ${target}.`);
    return { os, target };
  });
}

/** The matrix of the workflow `container-build.yml`. */
export function containerMatrix(platforms) {
  return platforms.map(platform => {
    const runner = containerRunners[platform];
    assert.ok(runner, `No runner is known for the container platform ${platform}.`);
    return { os: runner.os, arch: runner.arch };
  });
}

const usage =
  "Usage: platforms.mjs desktop <all|NAME,NAME> [--matrix] | platforms.mjs containers <all|NAME,NAME> [--matrix]";

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [kind, spec] = process.argv.slice(2);
  const matrix = process.argv.includes("--matrix");
  const release = JSON.parse(
    await readFile("scripts/release/release.json", "utf8"),
  );
  if (kind === "desktop" || kind === "containers") {
    const allowed =
      kind === "desktop"
        ? release.desktopTargets
        : release.containerPlatforms;
    const label = kind === "desktop" ? "desktop target" : "container platform";
    const selected = selectTargets(spec, allowed, label);
    const printed = matrix
      ? JSON.stringify(
          kind === "desktop"
            ? desktopMatrix(selected)
            : containerMatrix(selected),
        )
      : selected.join(" ");
    process.stdout.write(`${printed}\n`);
  } else {
    throw new Error(usage);
  }
}
