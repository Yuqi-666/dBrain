#!/usr/bin/env node
// The one entry of the push gate.
//
// `pnpm gate` prompts a person. `--until` selects the last stage for automation.
// `pnpm gate --verify` runs the same verifier that CI runs.

import { execFileSync } from 'node:child_process';
import { runGate } from './gate/run.mjs';
import { verifyCommand } from './gate/verify.mjs';

const argv = process.argv.slice(2);

function mergeBase() {
  try {
    return execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

async function main() {
  if (argv.includes('--verify')) {
    const options = argv.filter(arg => arg !== '--verify');
    if (!options.some(arg => arg.startsWith('--base='))) {
      const base = mergeBase();
      if (base) options.push(`--base=${base}`);
    }
    return verifyCommand(options);
  }
  return runGate(argv);
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
