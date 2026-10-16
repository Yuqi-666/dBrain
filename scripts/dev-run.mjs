/**
 * Start the development stack from the root `.env`.
 *
 *   pnpm dev         PocketBase, Next and the API, for this machine
 *   pnpm dev:remote  the same plus the development gateway, for a browser that
 *                    reaches this machine through a development domain
 *
 * Ports come from `.env` through `scripts/lib/dev-ports.mjs`; a variable set in
 * the shell wins over the file, as elsewhere in this repository. In the remote
 * shape Next binds loopback and only the gateway is exposed, so
 * `https://p<gateway port>.<dev domain>` reaches the whole stack.
 */
import { fileURLToPath } from "node:url";
import concurrently from "concurrently";
import {
  busyPortsReport,
  busyStackPorts,
  readDevStack,
  stackEnv,
} from "./lib/dev-ports.mjs";
import { copyPdfjsAssets } from "./lib/pdfjs-assets.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
try {
  process.loadEnvFile(envPath);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.warn(`[dev] ${envPath} not found; PocketBase will refuse to start without an operator account`);
}

const remote = process.argv.includes("--remote");
let stack;
try {
  stack = readDevStack(process.env, { remote });
} catch (error) {
  console.error(`[dev] ${error.message}`);
  process.exit(1);
}

const commands = [
  { command: "pnpm --filter=server dev:pb", name: "pb", prefixColor: "yellow" },
  ...(remote
    ? [
        {
          command: "node scripts/dev-gateway.mjs",
          name: "gateway",
          prefixColor: "magenta",
        },
      ]
    : []),
  {
    command: `pnpm --filter=web exec next dev -p ${stack.webPort}${remote ? " -H 127.0.0.1" : ""}`,
    name: "web",
    prefixColor: "blue",
  },
  {
    command: "pnpm --filter=server dev",
    name: "server",
    prefixColor: "green",
  },
];

if (remote) {
  const host = stack.domain ? `p${stack.gatewayPort}.${stack.domain}` : `p${stack.gatewayPort}.<dev-domain>`;
  console.log(`[dev] remote: https://${host}`);
  console.log(
    `[dev] the proxy rule must forward p<port>.<dev-domain> to 127.0.0.1:<port>; see docs/development.md`,
  );
  // The wildcard proxy forwards to whichever port the host names, so the web
  // port is reachable too. Next serves the pages but owns neither /trpc nor
  // /pb, which reads as "the login page opens and signing in does nothing".
  console.log(
    `[dev] sign in through that address; p${stack.webPort} reaches Next only, without /trpc or /pb`,
  );
} else {
  console.log(`[dev] local: http://localhost:${stack.webPort}`);
}
console.log(
  `[dev] web ${stack.webPort}, server ${stack.serverPort}, pocketbase ${stack.pbHttp}${
    remote ? `, gateway ${stack.gatewayPort}` : ""
  }`,
);

// One taken port kills the whole stack from three levels down: a child dies on
// EADDRINUSE, `concurrently` then kills the rest, and the browser only shows a
// 502 from the reverse proxy. Name the port and the variable instead.
const busy = await busyStackPorts(stack);
if (busy.length > 0) {
  for (const line of busyPortsReport(busy)) console.error(`[dev] ${line}`);
  process.exit(1);
}

// concurrently v9 has no top level `env` option, so the children inherit this
// process. Publish the resolved values here, before spawning.
for (const [name, value] of Object.entries(stackEnv(stack, process.env))) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = String(value);
}

// The viewer fetches its CMap and standard-font data from the web app's
// `public/` tree, and this script starts Next directly (`exec next dev`), so it
// never runs the app's own `dev` script — which is what does the copy.
await copyPdfjsAssets("web");

const { result } = concurrently(commands, {
  cwd: root,
  killOthersOn: ["failure", "success"],
  prefix: "[{name}]",
});

result.then(
  () => process.exit(0),
  () => process.exit(1),
);
