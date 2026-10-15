import assert from "node:assert/strict";
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashFile } from "../lib/runtime-manifest.mjs";
import { loadDeclaration, selectTargets } from "./platforms.mjs";
export const services = ["pocketbase", "server", "web"];
const readJSON = async (path) => JSON.parse(await readFile(path, "utf8"));
const safeName = (name) =>
  typeof name === "string" &&
  /^[a-zA-Z0-9_.-]+$/.test(name) &&
  name !== "." &&
  name !== ".." &&
  !name.includes("\n") &&
  !name.includes("\r");
export async function fileInventory(root, prefix = "") {
  const files = {};
  for (const name of (await readdir(join(root, prefix))).sort()) {
    assert.ok(safeName(name), `Unsafe artifact name: ${name}`);
    const relative = prefix ? `${prefix}/${name}` : name;
    const stat = await lstat(join(root, relative));
    assert.ok(!stat.isSymbolicLink(), `Artifact symlink rejected: ${relative}`);
    if (stat.isDirectory())
      Object.assign(files, await fileInventory(root, relative));
    else {
      assert.ok(stat.isFile(), `Artifact must be a file: ${relative}`);
      if (
        !["candidate-index.json", "acceptance-template.json"].includes(relative)
      )
        Object.defineProperty(files, relative, {
          value: await hashFile(join(root, relative)),
          enumerable: true,
          writable: true,
          configurable: true,
        });
    }
  }
  return files;
}
function identity(actual, expected) {
  for (const key of ["version", "commit", "runId", "runAttempt"])
    assert.equal(actual[key], expected[key], `${key} mismatch`);
}
export async function verifyCandidate(root, expected) {
  assert.match(expected.commit, /^[a-f0-9]{40}$/);
  assert.match(expected.runId, /^\d+$/);
  assert.match(expected.runAttempt, /^\d+$/);
  const targets = expected.desktopTargets;
  assert.deepEqual(
    (await readdir(root))
      .filter(
        (name) =>
          ![
            "containers",
            "deployment",
            "candidate-index.json",
            "acceptance-template.json",
          ].includes(name),
      )
      .sort(),
    [...targets].sort(),
    "Unexpected/missing desktop target",
  );
  const reports = {};
  for (const target of targets) {
    const dir = join(root, target);
    const report = await readJSON(join(dir, "build-report.json"));
    const runtime = await readJSON(join(dir, "runtime-manifest.json"));
    identity(report, expected);
    assert.equal(report.target, target);
    assert.equal(runtime.version, expected.version);
    assert.equal(runtime.commit, expected.commit);
    assert.equal(`${runtime.platform}-${runtime.arch}`, target);
    assert.equal(
      report.distributionReady,
      false,
      "Build is a candidate, not platform acceptance",
    );
    assert.ok(Array.isArray(report.installers) && report.installers.length > 0);
    const extensions =
      target === "linux-x64"
        ? [".deb", ".rpm", ".AppImage"]
        : target.startsWith("win32")
          ? [".exe", ".msi"]
          : [".dmg"];
    for (const extension of extensions)
      assert.ok(
        report.installers.some((name) => name.endsWith(extension)),
        `Missing ${target} ${extension}`,
      );
    for (const name of report.installers)
      assert.ok(
        safeName(name) &&
          name.startsWith(`${target}-`) &&
          extensions.some((ext) => name.endsWith(ext)),
        "Unexpected installer name",
      );
    if (report.signed) {
      assert.ok(report.updater && safeName(report.updater.asset) && safeName(report.updater.signature));
      assert.equal(report.updater.signature, `${report.updater.asset}.sig`);
      assert.ok(report.updater.asset.startsWith(`${target}-`));
      assert.ok((await readFile(join(dir, report.updater.signature), "utf8")).trim().length > 20);
    } else assert.equal(report.updater, null);
    const files = await fileInventory(dir);
    const lines = (await readFile(join(dir, "SHA256SUMS"), "utf8"))
      .trim()
      .split(/\r?\n/);
    const sums = {};
    for (const line of lines) {
      const match = /^([a-f0-9]{64})  ([a-zA-Z0-9_.-]+)$/.exec(line);
      assert.ok(match && safeName(match[2]), "Invalid SHA256SUMS entry");
      assert.ok(!Object.hasOwn(sums, match[2]), "Duplicate checksum entry");
      Object.defineProperty(sums, match[2], {
        value: match[1],
        enumerable: true,
      });
    }
    delete files.SHA256SUMS;
    assert.deepEqual(sums, files, `Artifact hash mismatch: ${target}`);
    assert.deepEqual(
      Object.keys(files).sort(),
      [
        ...report.installers,
        ...(report.updater ? [report.updater.signature, ...(!report.installers.includes(report.updater.asset) ? [report.updater.asset] : [])] : []),
        "runtime-manifest.json",
        "build-report.json",
        "LICENSE",
      ].sort(),
      "Unexpected installer artifact",
    );
    reports[target] = report;
  }
  const containers = await readJSON(
    join(root, "containers/container-report.json"),
  );
  identity(containers, expected);
  assert.deepEqual(Object.keys(containers.images).sort(), [...services].sort());
  for (const service of services) {
    const image = containers.images[service];
    assert.match(
      image.reference,
      /^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+@sha256:[a-f0-9]{64}$/,
    );
    assert.equal(
      image.reference.split("@")[0],
      `${expected.imagePrefix}-${service}`,
    );
    assert.deepEqual(
      [...image.platforms].sort(),
      [...expected.containerPlatforms].sort(),
    );
    assert.equal(image.smokePassed, true);
  }
  assert.deepEqual((await readdir(join(root, "containers"))).sort(), [
    "container-report.json",
  ]);
  assert.deepEqual((await readdir(join(root, "deployment"))).sort(), [
    ".env.example",
    "docker-compose.yml",
    "nginx.conf",
    "update.sh",
  ]);
  return { reports, containers };
}
export function acceptanceChecks(targets) {
  return [
    ...targets.flatMap((target) =>
      [
        "installation",
        "uninstall",
        "csp",
        "media",
        "upgrade",
        "process-exit",
      ].map((check) => `${target}.${check}`),
    ),
    "third-party-materials",
    "historical-data-migration",
    "backup-restore",
    "known-lint-debt",
  ];
}
export async function assembleCandidate(incoming, destination, expected) {
  // Never erase an input directory by accident.
  assert.ok(
    !resolve(incoming).startsWith(resolve(destination) + "/") &&
      !resolve(destination).startsWith(resolve(incoming) + "/") &&
      resolve(incoming) !== resolve(destination),
  );
  await rm(destination, { recursive: true, force: true });
  await cp(incoming, destination, { recursive: true });
  await mkdir(join(destination, "deployment"), { recursive: true });
  await writeFile(
    join(destination, "deployment/docker-compose.yml"),
    (await readFile("docker-compose.yml", "utf8")).replace("./deploy/nginx.conf", "./nginx.conf"),
  );
  await cp("deploy/nginx.conf", join(destination, "deployment/nginx.conf"));
  await cp("deploy/update.sh", join(destination, "deployment/update.sh"));
  // The deployed stack refuses to start without `.env`, so its template ships
  // next to the compose file it is copied for.
  await cp("deploy/.env.example", join(destination, "deployment/.env.example"));
  await verifyCandidate(destination, expected);
  const index = {
    schemaVersion: 1,
    ...expected,
    files: await fileInventory(destination),
  };
  await writeFile(
    join(destination, "candidate-index.json"),
    JSON.stringify(index, null, 2) + "\n",
  );
  const acceptance = {
    schemaVersion: 1,
    version: expected.version,
    commit: expected.commit,
    runId: expected.runId,
    runAttempt: expected.runAttempt,
    candidateIndexSha256: await hashFile(
      join(destination, "candidate-index.json"),
    ),
    reviewer: "",
    reviewedAt: "",
    checks: Object.fromEntries(
      acceptanceChecks(expected.desktopTargets).map((name) => [
        name,
        { status: "pending", evidence: "" },
      ]),
    ),
    thirdPartyMaterials: { url: "", sha256: "" },
  };
  await writeFile(
    join(destination, "acceptance-template.json"),
    JSON.stringify(acceptance, null, 2) + "\n",
  );
  return index;
}
export async function approveCandidate(root, acceptance, expected) {
  const index = await readJSON(join(root, "candidate-index.json"));
  assert.equal(index.schemaVersion, 1);
  assert.equal(acceptance.schemaVersion, 1);
  identity(index, expected);
  identity(acceptance, expected);
  assert.equal(index.repository, expected.repository);
  assert.equal(index.imagePrefix, expected.imagePrefix);
  assert.deepEqual(index.desktopTargets, expected.desktopTargets);
  assert.deepEqual(index.containerPlatforms, expected.containerPlatforms);
  assert.equal(
    acceptance.candidateIndexSha256,
    await hashFile(join(root, "candidate-index.json")),
    "Acceptance is for a different candidate",
  );
  assert.deepEqual(
    index.files,
    await fileInventory(root),
    "Candidate files modified after assembly",
  );
  const verified = await verifyCandidate(root, expected);
  for (const target of expected.desktopTargets) {
    assert.equal(
      verified.reports[target].signed,
      true,
      `${target} is unsigned`,
    );
    assert.ok(verified.reports[target].updater, `${target} has no updater artifact`);
    if (target.startsWith("linux")) continue;
    assert.equal(
      verified.reports[target].signingVerified,
      true,
      `${target} signing verification missing`,
    );
  }
  assert.ok(
    typeof acceptance.reviewer === "string" &&
      acceptance.reviewer.trim().length > 0,
    "Missing reviewer",
  );
  assert.ok(
    typeof acceptance.reviewedAt === "string" &&
      Number.isFinite(Date.parse(acceptance.reviewedAt)),
    "Missing review date",
  );
  assert.deepEqual(
    Object.keys(acceptance.checks).sort(),
    acceptanceChecks(expected.desktopTargets).sort(),
  );
  for (const [name, check] of Object.entries(acceptance.checks)) {
    assert.equal(check.status, "passed", `Acceptance pending: ${name}`);
    assert.ok(
      typeof check.evidence === "string" && check.evidence.trim().length >= 10,
      `Evidence missing: ${name}`,
    );
  }
  const url = new URL(acceptance.thirdPartyMaterials.url);
  assert.equal(url.protocol, "https:");
  assert.ok(!url.username && !url.password);
  assert.match(acceptance.thirdPartyMaterials.sha256, /^[a-f0-9]{64}$/);
  return index;
}
export async function prepareReleaseAssets(
  root,
  acceptancePath,
  out,
  expected,
) {
  const index = await approveCandidate(
    root,
    await readJSON(acceptancePath),
    expected,
  );
  await mkdir(out);
  await cp(
    join(root, "candidate-index.json"),
    join(out, "candidate-index.json"),
  );
  await cp(acceptancePath, join(out, "acceptance.json"));
  for (const target of index.desktopTargets) {
    const dir = join(root, target);
    for (const name of (await readdir(dir)).filter(
      (name) => name !== "SHA256SUMS",
    ))
      await cp(
        join(dir, name),
        join(out, name.startsWith(`${target}-`) ? name : `${target}-${name}`),
      );
  }
  await writeFile(
    join(out, "docker-compose.yml"),
    (
      await readFile(join(root, "deployment/docker-compose.yml"), "utf8")
    ).replace("./deploy/nginx.conf", "./nginx.conf"),
  );
  await cp(join(root, "deployment/nginx.conf"), join(out, "nginx.conf"));
  await cp(join(root, "deployment/update.sh"), join(out, "update.sh"));
  await cp(join(root, "deployment/.env.example"), join(out, ".env.example"));
  const updaterPlatforms = {
    "linux-x64": "linux-x86_64",
    "win32-x64": "windows-x86_64",
    "darwin-x64": "darwin-x86_64",
    "darwin-arm64": "darwin-aarch64",
  };
  const platforms = {};
  for (const target of index.desktopTargets) {
    const report = await readJSON(join(root, target, "build-report.json"));
    assert.ok(report.updater, `Updater artifact missing for ${target}`);
    platforms[updaterPlatforms[target]] = {
      url: `https://github.com/${index.repository}/releases/download/v${index.version}/${report.updater.asset}`,
      signature: (await readFile(join(root, target, report.updater.signature), "utf8")).trim(),
    };
  }
  await writeFile(join(out, "latest.json"), JSON.stringify({ version: index.version, platforms }, null, 2) + "\n");
  const containers = await readJSON(
    join(root, "containers/container-report.json"),
  );
  await writeFile(
    join(out, "compose.release.yml"),
    "services:\n" +
      services
        .map(
          (service) =>
            `  ${service}:\n    image: ${containers.images[service].reference}\n`,
        )
        .join(""),
  );
  const acceptance = await readJSON(acceptancePath);
  await writeFile(
    join(out, "RELEASE-NOTES.md"),
    `dBrain ${index.version}\n\nSource: ${index.commit}\nCandidate: ${index.runId}, attempt ${index.runAttempt}\n\nThird-party license and source materials: ${acceptance.thirdPartyMaterials.url}\nMaterials SHA256: ${acceptance.thirdPartyMaterials.sha256}\n\nInstall and upgrade instructions: docs/usage.md at source commit.\n`,
  );
  const files = Object.fromEntries(
    await Promise.all(
      (await readdir(out))
        .sort()
        .map(async (name) => [name, await hashFile(join(out, name))]),
    ),
  );
  await writeFile(
    join(out, "SHA256SUMS"),
    Object.entries(files)
      .map(([name, hash]) => `${hash}  ${name}`)
      .join("\n") + "\n",
  );
  return index;
}
/** Reads `--name=text`. An absent text keeps the declared platforms. */
function option(args, name) {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const release = await loadDeclaration();
  const args = process.argv.slice(2);
  const [mode, ...positional] = args.filter((arg) => !arg.startsWith("--"));
  const expected = {
    ...release,
    repository: process.env.GITHUB_REPOSITORY,
    commit: process.env.DBRAIN_CANDIDATE_SHA ?? process.env.GITHUB_SHA,
    runId: process.env.DBRAIN_CANDIDATE_RUN_ID ?? process.env.GITHUB_RUN_ID,
    runAttempt:
      process.env.DBRAIN_CANDIDATE_RUN_ATTEMPT ??
      process.env.GITHUB_RUN_ATTEMPT,
    imagePrefix: `ghcr.io/${process.env.GITHUB_REPOSITORY.toLowerCase()}`,
  };
  if (mode === "assemble") {
    // The candidate holds the platforms of this start. A start may narrow the
    // declaration of release.json, and it cannot add a platform.
    expected.desktopTargets = selectTargets(
      option(args, "desktop"),
      release.desktopTargets,
      "desktop target",
    );
    expected.containerPlatforms = selectTargets(
      option(args, "containers"),
      release.containerPlatforms,
      "container platform",
    );
    await assembleCandidate(positional[0], positional[1], expected);
  } else if (mode === "approve") {
    // The candidate index names the platforms of the run that a person tested.
    // A release therefore publishes what the acceptance record covers. The
    // list must still stay inside the declaration of release.json, so an
    // edited index cannot invent a platform.
    const index = await readJSON(
      join(positional[0], "candidate-index.json"),
    );
    expected.desktopTargets = selectTargets(
      index.desktopTargets.join(","),
      release.desktopTargets,
      "desktop target",
    );
    expected.containerPlatforms = selectTargets(
      index.containerPlatforms.join(","),
      release.containerPlatforms,
      "container platform",
    );
    await prepareReleaseAssets(
      positional[0],
      positional[1],
      positional[2],
      expected,
    );
  } else
    throw new Error(
      "Usage: candidate.mjs assemble <incoming> <output> [--desktop=LIST] [--containers=LIST] | approve <candidate> <acceptance.json> <assets>",
    );
}
