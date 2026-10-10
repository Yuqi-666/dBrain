/** Prepare on the target platform: native libraries and executables cannot be cross-copied. */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { chmod, copyFile, cp, mkdir, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Desktop runtime requires Node 22 or newer");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const destination = join(root, "apps/desktop/src-tauri/runtime");
const staging = join(root, "apps/desktop/.runtime-staging");
const exe = name => process.platform === "win32" ? `${name}.exe` : name;
function binary(name, override) {
  if (override) return resolve(override);
  return execFileSync(process.platform === "win32" ? "where.exe" : "which", [name], { encoding: "utf8" }).trim().split(/\r?\n/)[0];
}
// Validate required tools before replacing a previously working runtime.
const binaries = {
  node: process.execPath,
  pocketbase: process.env.DBRAIN_POCKETBASE_PATH || join(root, "pb", exe("pocketbase")),
  ffmpeg: binary("ffmpeg", process.env.FFMPEG_PATH),
  ffprobe: binary("ffprobe", process.env.FFPROBE_PATH),
};
for (const [name, path] of Object.entries(binaries)) {
  execFileSync(path, [name === "pocketbase" ? "--version" : name === "node" ? "--version" : "-version"], { stdio: "ignore" });
}
await rm(staging, { recursive: true, force: true });
try {
  const pnpmEntry = process.env.npm_execpath;
  if (!pnpmEntry) throw new Error("Run this script with pnpm --filter desktop runtime:prepare");
  execFileSync(process.execPath, [pnpmEntry, "--filter", "@workspace/infrastructure", "deploy", "--prod", staging], { cwd: root, stdio: "inherit", env: { ...process.env, npm_config_ignore_scripts: "true" } });
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  // Dereference pnpm links: packaged resources must not depend on the build checkout.
  // Flatten the deployed package graph. Copying .pnpm and dereferencing top-level
  // links alone breaks canvas's sibling optional-native-package resolution.
  const modules = join(staging, "node_modules");
  const targetModules = join(destination, "node_modules");
  await mkdir(targetModules);
  await cp(join(modules, ".pnpm/node_modules"), targetModules, { recursive: true, dereference: true });
  for (const entry of await readdir(modules)) {
    if (entry.startsWith(".")) continue;
    await cp(join(modules, entry), join(targetModules, entry), { recursive: true, dereference: true });
  }
  // pnpm installs both Linux optional bindings. Only ship the current libc;
  // linuxdeploy scans ELF resources and cannot inspect the unused musl binding.
  if (process.platform === "linux") {
    const report = process.report.getReport();
    const libc = report.header.glibcVersionRuntime ? "gnu" : "musl";
    const namespace = join(targetModules, "@napi-rs");
    const selected = `canvas-linux-${process.arch}-${libc}`;
    for (const name of await readdir(namespace)) {
      if (name.startsWith("canvas-linux-") && name !== selected) {
        await rm(join(namespace, name), { recursive: true, force: true });
      }
    }
  }
  await cp(join(root, "pb/pb_migrations"), join(destination, "pb_migrations"), { recursive: true });
  await cp(join(root, "apps/server/src/desktop/pb_hooks"), join(destination, "pb_hooks"), { recursive: true });
  for (const [name, path] of Object.entries(binaries)) {
    const target = join(destination, exe(name));
    await copyFile(await realpath(path), target);
    await chmod(target, 0o755);
  }
  await build({
    entryPoints: [join(root, "apps/server/src/desktop/runtime.ts")],
    outfile: join(destination, "backend.mjs"), bundle: true, platform: "node", format: "esm", target: "node22",
    tsconfig: join(root, "apps/server/tsconfig.json"),
    external: ["@napi-rs/canvas", "pdfjs-dist", "bufferutil", "utf-8-validate"],
    banner: { js: 'import { createRequire as __dbrainCreateRequire } from "node:module"; const require = __dbrainCreateRequire(import.meta.url);' },
  });
  if (process.platform === "linux") {
    await mkdir(join(destination, "lib"));
    const nativeFiles = [];
    async function collect(path) {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        const child = join(path, entry.name);
        if (entry.isDirectory()) await collect(child);
        else if (entry.name.endsWith(".node")) nativeFiles.push(child);
      }
    }
    await collect(join(destination, "node_modules"));
    const libraries = new Map();
    for (const path of [...Object.values(binaries), ...nativeFiles]) {
      let output;
      try { output = execFileSync("ldd", [path], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
      catch { continue; } // Static binaries need no shared objects.
      if (output.includes("not found")) throw new Error(`Missing shared libraries for ${path}: ${output}`);
      for (const match of output.matchAll(/^\s*(\S+) => (\/\S+)/gm)) {
        const [, name, path] = match;
        // The dynamic loader and glibc must come from the target system together.
        if (/^(libc|libm|libpthread|libdl|librt)\.so/.test(name)) continue;
        const previous = libraries.get(name);
        const resolved = await realpath(path);
        if (previous && previous !== resolved) throw new Error(`Conflicting shared library ${name}`);
        libraries.set(name, resolved);
      }
    }
    for (const [name, path] of libraries) await copyFile(path, join(destination, "lib", name));
  }
  // Tauri reuses AppDir; removed resources otherwise survive and linuxdeploy
  // still scans the old optional bindings on a subsequent build.
  for (const cache of ["runtime", "bundle/appimage/dBrain.AppDir", "bundle/appimage_deb"]) {
    await rm(join(root, "apps/desktop/src-tauri/target/release", cache), { recursive: true, force: true });
  }
  await writeFile(join(destination, "runtime-manifest.json"), JSON.stringify({ platform: process.platform, arch: process.arch, node: process.version, preparedAt: new Date().toISOString() }, null, 2));
  console.log(`Desktop backend prepared: ${process.platform}/${process.arch}`);
} finally { await rm(staging, { recursive: true, force: true }); }
