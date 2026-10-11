import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { hashFile } from "../lib/runtime-manifest.mjs";
const target = `${process.platform}-${process.arch}`;
const source = resolve("apps/desktop/src-tauri/target/release/bundle");
const destination = resolve("release-artifacts", target);
await mkdir(destination, { recursive: true });
const sums = [];
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.endsWith(".app"))
      await collect(join(dir, entry.name));
    else if (
      entry.isFile() &&
      /\.(deb|rpm|AppImage|exe|msi|dmg)$/.test(entry.name)
    ) {
      const name = `${target}-${entry.name}`;
      await cp(join(dir, entry.name), join(destination, name));
      sums.push(`${await hashFile(join(destination, name))}  ${name}`);
    }
  }
}
await collect(source);
if (!sums.length) throw new Error("No installer produced");
await cp(
  "apps/desktop/src-tauri/runtime/runtime-manifest.json",
  join(destination, "runtime-manifest.json"),
);
await cp("LICENSE", join(destination, "LICENSE"));
await writeFile(join(destination, "SHA256SUMS"), `${sums.sort().join("\n")}\n`);
const manifest = JSON.parse(
  await readFile(join(destination, "runtime-manifest.json")),
);
await writeFile(
  join(destination, "build-report.json"),
  JSON.stringify(
    {
      target,
      version: manifest.version,
      commit: manifest.commit,
      distributionReady: false,
      reason:
        "Candidate only. Signing, platform installation/media/upgrade acceptance and third-party distribution materials must be verified before publication.",
    },
    null,
    2,
  ),
);
console.log(`Candidate installers collected: ${target}`);
