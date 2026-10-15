import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  prepareReleaseAssets,
  acceptanceChecks,
  approveCandidate,
  assembleCandidate,
  services,
} from "./candidate.mjs";
import { hashFile } from "../lib/runtime-manifest.mjs";
const expected = {
  version: "0.1.0",
  commit: "a".repeat(40),
  runId: "123",
  runAttempt: "1",
  repository: "Yuqi-666/dBrain",
  imagePrefix: "ghcr.io/yuqi-666/dbrain",
  desktopTargets: ["linux-x64", "win32-x64", "darwin-x64", "darwin-arm64"],
  containerPlatforms: ["linux/amd64", "linux/arm64"],
};
async function fixture(signed = true, plan = expected) {
  const dir = await mkdtemp(join(tmpdir(), "dbrain-candidate-test-"));
  const incoming = join(dir, "incoming"),
    output = join(dir, "candidate");
  await mkdir(incoming);
  for (const target of plan.desktopTargets) {
    const path = join(incoming, target);
    await mkdir(path);
    const [platform, arch] = target.split("-");
    const extensions =
      platform === "linux"
        ? ["deb", "rpm", "AppImage"]
        : platform === "win32"
          ? ["exe", "msi"]
          : ["dmg"];
    const installers = extensions.map((ext) => `${target}-dBrain.${ext}`);
    const updater = signed ? {
      asset: platform === "darwin" ? `${target}-dBrain.app.tar.gz` : platform === "linux" ? `${target}-dBrain.AppImage` : `${target}-dBrain-setup.exe`,
      signature: platform === "darwin" ? `${target}-dBrain.app.tar.gz.sig` : platform === "linux" ? `${target}-dBrain.AppImage.sig` : `${target}-dBrain-setup.exe.sig`,
    } : null;
    if (signed && platform === "win32") installers[0] = updater.asset;
    const files = Object.fromEntries(
      installers.map((name) => [name, "installer bytes"]),
    );
    if (signed) {
      if (platform === "darwin") files[updater.asset] = "updater bytes";
      files[updater.signature] = "signed updater artifact contents";
    }
    files["runtime-manifest.json"] = JSON.stringify({
      platform,
      arch,
      version: plan.version,
      commit: plan.commit,
    });
    files["build-report.json"] = JSON.stringify({
      ...plan,
      target,
      signed,
      signingVerified: signed,
      distributionReady: false,
      installers,
      updater,
    });
    files.LICENSE = "All rights reserved.";
    const sums = [];
    for (const [name, data] of Object.entries(files)) {
      await writeFile(join(path, name), data);
      sums.push(`${await hashFile(join(path, name))}  ${name}`);
    }
    await writeFile(join(path, "SHA256SUMS"), sums.join("\n") + "\n");
  }
  if (plan.containerPlatforms.length) {
    await mkdir(join(incoming, "containers"));
    await writeFile(
    join(incoming, "containers/container-report.json"),
    JSON.stringify({
      ...plan,
      images: Object.fromEntries(
        services.map((service) => [
          service,
          {
            reference: `${plan.imagePrefix}-${service}@sha256:${"b".repeat(64)}`,
            platforms: plan.containerPlatforms,
            smokePassed: true,
          },
        ]),
      ),
    }),
    );
  }
  return { dir, incoming, output };
}
async function accepted(output, plan = expected) {
  const acceptance = JSON.parse(
    await readFile(join(output, "acceptance-template.json")),
  );
  acceptance.reviewer = "release-reviewer";
  acceptance.reviewedAt = "2026-10-11T00:00:00Z";
  for (const key of acceptanceChecks(plan.desktopTargets))
    acceptance.checks[key] = {
      status: "passed",
      evidence: "Recorded platform acceptance with screenshots and logs",
    };
  acceptance.thirdPartyMaterials = {
    url: "https://example.com/release-materials.tar.gz",
    sha256: "c".repeat(64),
  };
  return acceptance;
}
test("complete signed candidate and explicit acceptance pass; templates cannot publish", async () => {
  const f = await fixture();
  try {
    await assembleCandidate(f.incoming, f.output, expected);
    const pending = JSON.parse(
      await readFile(join(f.output, "acceptance-template.json")),
    );
    await assert.rejects(
      approveCandidate(f.output, pending, expected),
      /Missing reviewer/,
    );
    const acceptance = await accepted(f.output);
    assert.equal(
      (await approveCandidate(f.output, acceptance, expected)).commit,
      expected.commit,
    );
    acceptance.checks["linux-x64.csp"].status = "pending";
    await assert.rejects(
      approveCandidate(f.output, acceptance, expected),
      /Acceptance pending/,
    );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});
test("modified installers, missing targets, different commits and run attempts fail closed", async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      assembleCandidate(f.incoming, f.output, {
        ...expected,
        commit: "d".repeat(40),
      }),
      /commit mismatch/,
    );
    await assert.rejects(
      assembleCandidate(f.incoming, f.output, { ...expected, runAttempt: "2" }),
      /runAttempt mismatch/,
    );
    await assembleCandidate(f.incoming, f.output, expected);
    const acceptance = await accepted(f.output);
    acceptance.candidateIndexSha256 = "0".repeat(64);
    await assert.rejects(
      approveCandidate(f.output, acceptance, expected),
      /different candidate/,
    );
    await writeFile(
      join(f.output, "linux-x64/linux-x64-dBrain.deb"),
      "modified",
    );
    await assert.rejects(
      approveCandidate(f.output, await accepted(f.output), expected),
      /files modified/,
    );
    await rm(join(f.incoming, "darwin-arm64"), { recursive: true });
    await assert.rejects(
      assembleCandidate(f.incoming, f.output, expected),
      /missing desktop target/,
    );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});
test("unsigned candidates may be inspected but cannot be approved for release", async () => {
  const f = await fixture(false);
  try {
    await assembleCandidate(f.incoming, f.output, expected);
    await assert.rejects(
      approveCandidate(f.output, await accepted(f.output), expected),
      /unsigned/,
    );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test("a subset candidate carries only the selected platforms", async () => {
  const subset = {
    ...expected,
    desktopTargets: ["linux-x64"],
    containerPlatforms: ["linux/arm64"],
  };
  const f = await fixture(true, subset);
  try {
    const index = await assembleCandidate(f.incoming, f.output, subset);
    assert.deepEqual(index.desktopTargets, ["linux-x64"]);
    assert.deepEqual(index.containerPlatforms, ["linux/arm64"]);
    const template = JSON.parse(
      await readFile(join(f.output, "acceptance-template.json")),
    );
    assert.deepEqual(
      Object.keys(template.checks),
      acceptanceChecks(["linux-x64"]),
    );
    await approveCandidate(f.output, await accepted(f.output, subset), subset);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test("single product families assemble and publish without the other family", async () => {
  for (const plan of [
    { ...expected, desktopTargets: [] },
    { ...expected, containerPlatforms: [] },
  ]) {
    const f = await fixture(true, plan);
    try {
      await assembleCandidate(f.incoming, f.output, plan);
      const acceptancePath = join(f.dir, "acceptance.json");
      await writeFile(acceptancePath, JSON.stringify(await accepted(f.output, plan)));
      const assets = join(f.dir, "assets");
      await prepareReleaseAssets(f.output, acceptancePath, assets, plan);
      const names = await readdir(assets);
      assert.equal(names.includes("latest.json"), plan.desktopTargets.length > 0);
      assert.equal(names.includes("compose.release.yml"), plan.containerPlatforms.length > 0);
    } finally {
      await rm(f.dir, { recursive: true, force: true });
    }
  }
});

test("published assets preserve hashes and deploy the accepted digests without stale files", async () => {
  const f = await fixture();
  try {
    await assembleCandidate(f.incoming, f.output, expected);
    const acceptancePath = join(f.dir, "acceptance.json");
    await writeFile(acceptancePath, JSON.stringify(await accepted(f.output)));
    const assets = join(f.dir, "assets");
    await prepareReleaseAssets(f.output, acceptancePath, assets, expected);
    const sums = (await readFile(join(assets, "SHA256SUMS"), "utf8"))
      .trim()
      .split("\n");
    assert.ok(sums.some((line) => line.endsWith("  candidate-index.json")));
    for (const line of sums) {
      const [hash, name] = line.split("  ");
      assert.equal(await hashFile(join(assets, name)), hash);
    }
    assert.match(
      await readFile(join(assets, "compose.release.yml"), "utf8"),
      /pocketbase@sha256:[b]+/,
    );
    const latest = JSON.parse(await readFile(join(assets, "latest.json"), "utf8"));
    assert.equal(latest.version, expected.version);
    assert.equal(Object.keys(latest.platforms).length, expected.desktopTargets.length);
    assert.ok(
      !(await readFile(join(assets, "docker-compose.yml"), "utf8")).includes(
        "./deploy/nginx.conf",
      ),
    );
    await assert.rejects(
      prepareReleaseAssets(f.output, acceptancePath, assets, expected),
      /EEXIST/,
    );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});
