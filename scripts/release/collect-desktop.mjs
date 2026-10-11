import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { hashFile } from "../lib/runtime-manifest.mjs";
const target = `${process.platform}-${process.arch}`;
const source = resolve("apps/desktop/src-tauri/target/release/bundle");
const destination = resolve("release-artifacts", target);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
const installers = [];
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.endsWith(".app"))
      await collect(join(dir, entry.name));
    else if (
      entry.isFile() &&
      /\.(deb|rpm|AppImage|exe|msi|dmg)$/.test(entry.name)
    ) {
      const name = `${target}-${entry.name}`;
      if (installers.includes(name))
        throw new Error(`Duplicate installer: ${name}`);
      await cp(join(dir, entry.name), join(destination, name));
      installers.push(name);
    }
  }
}
await collect(source);
if (!installers.length) throw new Error("No installer produced");
await cp(
  "apps/desktop/src-tauri/runtime/runtime-manifest.json",
  join(destination, "runtime-manifest.json"),
);
await cp("LICENSE", join(destination, "LICENSE"));
const manifest = JSON.parse(
  await readFile(join(destination, "runtime-manifest.json")),
);
await writeFile(
  join(destination, "build-report.json"),
  JSON.stringify(
    {
      target,
      runtimeHashScope: "prepared-runtime-before-installer-transforms",
      version: manifest.version,
      commit: manifest.commit,
      signed: process.env.DBRAIN_BUILD_SIGNED === "true",
      // Native installer verification runs before collection in the signed workflow.
      signingVerified: process.env.DBRAIN_SIGNING_VERIFIED === "true",
      runId: process.env.GITHUB_RUN_ID ?? null,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      installers: installers.sort(),
      distributionReady: false,
      reason:
        "Candidate. Installation, CSP, media, upgrade and third-party distribution acceptance remain required.",
    },
    null,
    2,
  ) + "\n",
);
const sums = [];
for (const name of (await readdir(destination)).sort())
  sums.push(`${await hashFile(join(destination, name))}  ${name}`);
await writeFile(join(destination, "SHA256SUMS"), sums.join("\n") + "\n");
console.log(`Candidate installers collected: ${target}`);
