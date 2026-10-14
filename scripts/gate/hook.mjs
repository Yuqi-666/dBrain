// The local push gate: the `pre-push` hook.
//
// The hook refuses a push that the local gate did not produce. Git calls the
// hook before it sends a ref. The hook reads the ref list on standard input.
// It then applies the same trailer rules as the CI verifier, so one rule set
// holds for the machine and for GitHub.
//
// The hook is a brake, not the authority. The job `verify` of `gate.yml`
// stays the authority, because it reads the key of the account. The hook stops
// an accident before the commit leaves the machine. It does not replace the
// GitHub check.
//
// The hook makes these decisions.
//
// 1. A push that writes `main` directly is refused. `main` moves through a
//    merge of a pull request.
// 2. The tip of a pushed branch must pass the verifier in `verify.mjs`.
// 3. A pushed tag must point at a gated commit or at a merge commit.
// 4. A commit without a signature is refused. The job `verify` rejects one.
//
// Two emergency paths exist. Git skips every hook with `git push --no-verify`.
// The variable `DBRAIN_GATE_BYPASS=1` makes the hook accept every ref and
// print a warning. The job `verify` stays red after either path.
//
// Install the hook once with `pnpm gate:hooks`. The command writes a small
// file into `.git/hooks`. That file calls the tracked script of the checkout.
// The command `pnpm gate` installs the file again when it is missing.

import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checks, protocol, protectedPaths, trackedDeny } from './checks.mjs';
import { createGit, verifyGate } from './verify.mjs';

const definition = { protocol, checks, protectedPaths, trackedDeny };

/** The directory that holds the tracked hook script. */
export const hookDirectory = 'scripts/gate/hooks';

/** A marker that names our stub in `.git/hooks`. */
export const stubMarker = 'dbrain-local-push-gate';

/** The branch that a direct push may not write. */
export const protectedBranch = 'main';

/** The variable that turns the hook off for one push. */
export const bypassVariable = 'DBRAIN_GATE_BYPASS';

const zeroSha = /^0+$/;

const signatureReasons = {
  N: 'the commit has no signature',
  U: 'the local Git holds no allowed signer for the key',
  B: 'the signature is bad',
  E: 'the signing key is expired',
  X: 'the signature is expired',
  Y: 'the signing key is not trusted',
  R: 'the signing key is revoked',
};

export const usage = `Usage: node scripts/gate/hook.mjs [options]

The pre-push hook of the push gate. Git calls the mode without options and
writes the ref list to standard input.

Options:
      --install  Install the hook in this clone.
      --force    Replace a different core.hooksPath.
  -h, --help     Print this text.
`;

function tryGit(git, args) {
  try {
    return git(args);
  } catch {
    return '';
  }
}

const defaultIo = {
  log: message => process.stderr.write(`${message}\n`),
};

// One line of the push: <local ref> <local sha> <remote ref> <remote sha>.
export function parsePushRefs(text) {
  return String(text)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/);
      return { localRef, localSha, remoteRef, remoteSha };
    });
}

// The base of the comparison. It is the same base that `pnpm gate` uses, so
// the hook and the gate select the same checks.
export function baseCommit({ git, head, branch = protectedBranch }) {
  for (const ref of [branch, `origin/${branch}`]) {
    const base = tryGit(git, ['merge-base', ref, head]);
    if (base) return base;
  }
  return '';
}

// The signature of a commit, read from the local repository. The code `G`
// means a valid signature. The code `U` means a good signature whose key this
// clone cannot check, because the clone holds no signer list. The code `N`
// means that the commit holds no signature.
export function localSignatureVerifier({ git }) {
  return async ({ sha }) => {
    const line = tryGit(git, ['log', '-1', '--format=%G?%x00%GS', sha]);
    if (!line) return { verified: false, code: '', reason: 'the local Git cannot read the commit' };
    const [code, signer] = line.split('\0');
    return {
      verified: code === 'G',
      code,
      reason: signatureReasons[code] ?? `the local Git reports the code ${code || '(none)'}`,
      login: signer || null,
    };
  };
}

async function gatedSubject({ git, sha, verifySignature, branch }) {
  return verifyGate(
    {
      headSha: sha,
      baseSha: baseCommit({ git, head: sha, branch }),
      definition,
      // The label `gate-change` is a decision of the pull request. The local
      // hook holds no label, so it does not judge one. The job `verify` does.
      gateChangeApproved: true,
      // The hook judges the signature itself, with the code of the local Git.
      signatureNotes: false,
    },
    { git, verifySignature },
  );
}

async function checkTag(ref, { git, verifySignature, branch }) {
  const failures = [];
  const notes = [];
  const commit = tryGit(git, ['rev-parse', '--verify', `${ref.localSha}^{commit}`]);
  if (!commit) {
    failures.push(`The tag ${ref.remoteRef} does not point at a commit.`);
    return { failures, notes };
  }
  const parents = tryGit(git, ['rev-list', '--parents', '-n', '1', commit]).split(' ').slice(1);
  if (parents.length >= 2) {
    notes.push(`The tag ${ref.remoteRef} points at a merge commit. The push gate accepted it.`);
    return { failures, notes };
  }
  const result = await gatedSubject({ git, sha: commit, verifySignature, branch });
  for (const failure of result.failures) failures.push(`The tag ${ref.remoteRef}: ${failure}`);
  for (const note of result.notes) notes.push(`The tag ${ref.remoteRef}: ${note}`);
  return { failures, notes };
}

async function checkBranch(ref, { git, verifySignature, branch }) {
  const failures = [];
  const notes = [];
  const result = await gatedSubject({ git, sha: ref.localSha, verifySignature, branch });
  for (const failure of result.failures) failures.push(`${ref.remoteRef}: ${failure}`);
  for (const note of result.notes) notes.push(`${ref.remoteRef}: ${note}`);
  return { failures, notes };
}

// Every ref of one push. The result holds the refusals and the notes.
export async function evaluatePush({ refs, git, verifySignature, branch = protectedBranch }) {
  const failures = [];
  const notes = [];

  for (const ref of refs) {
    const target = ref.remoteRef || ref.localRef;
    if (zeroSha.test(ref.localSha)) {
      notes.push(`The push deletes ${target}.`);
      continue;
    }

    if (target === `refs/heads/${branch}`) {
      failures.push(
        `The push writes ${branch} directly. Work on a branch. \`pnpm gate\` pushes the branch and opens a pull request.`,
      );
      continue;
    }

    const signature = await verifySignature({ sha: ref.localSha });
    if (signature.verified !== true) {
      if (signature.code === 'N') {
        failures.push(
          `${target}: the tip commit has no signature. The job verify rejects an unsigned commit.`,
        );
      } else {
        notes.push(
          `${target}: the local Git cannot check the signature (${signature.reason}). The job verify checks it against GitHub.`,
        );
      }
    }

    const checked = target.startsWith('refs/tags/')
      ? await checkTag(ref, { git, verifySignature, branch })
      : await checkBranch(ref, { git, verifySignature, branch });
    failures.push(...checked.failures);
    notes.push(...checked.notes);
  }

  return { ok: failures.length === 0, failures, notes };
}

/** The path of the tracked hook script in a repository. */
export function hookFile(root) {
  return resolve(root, hookDirectory, 'pre-push');
}

// A small file in `.git/hooks` calls the tracked script of the current
// checkout. The file stays in place when a checkout removes the tracked
// script, so the brake cannot go missing without a message. A missing script
// is a refusal, not a silent skip: Git skips a hook that does not exist.
export function hookStub(root) {
  return `#!/usr/bin/env bash
# The local push gate. \`pnpm gate:hooks\` writes this file. ${stubMarker}
#
# This file stays in .git/hooks. A checkout cannot remove it. It calls the
# tracked hook of the checkout that runs the push.
set -euo pipefail
gate="${hookFile(root)}"
if [ ! -x "$gate" ]; then
  echo "The local push gate is missing: $gate" >&2
  echo "This checkout holds no hook script. Switch to a branch that holds one, or run \\\`pnpm gate:hooks\\\`." >&2
  echo "An emergency push: git push --no-verify ..." >&2
  exit 1
fi
exec "$gate"
`;
}

// The installer writes the stub and hands over the exit code of the tracked
// script. It refuses three states, because each one turns the brake off.
//
// 1. The tracked script is missing, or it is not executable. Git skips a hook
//    without the executable bit.
// 2. `core.hooksPath` is set. Git then ignores `.git/hooks` and the stub never
//    runs.
// 3. Another hook already owns `.git/hooks/pre-push`. The caller passes
//    `force` to replace it.
export function installHooks({ root, git, force = false }) {
  const script = hookFile(root);
  if (!existsSync(script)) {
    return {
      ok: false,
      installed: false,
      script,
      reason: `The file ${hookDirectory}/pre-push is missing.`,
    };
  }
  if ((statSync(script).mode & 0o111) === 0) {
    return {
      ok: false,
      installed: false,
      script,
      reason: `The file ${hookDirectory}/pre-push is not executable.`,
    };
  }

  const configured = tryGit(git, ['config', '--local', '--get', 'core.hooksPath']);
  if (configured) {
    return {
      ok: false,
      installed: false,
      script,
      reason: `core.hooksPath is set to ${configured}. Git ignores .git/hooks while the setting exists.`,
    };
  }

  const directory = resolve(
    root,
    tryGit(git, ['rev-parse', '--git-path', 'hooks']) || '.git/hooks',
  );
  const target = resolve(directory, 'pre-push');
  const content = hookStub(root);
  if (existsSync(target)) {
    const current = readFileSync(target, 'utf8');
    if (current === content) return { ok: true, installed: false, path: target, script };
    if (!current.includes(stubMarker) && !force) {
      return {
        ok: false,
        installed: false,
        path: target,
        script,
        reason: `Another hook owns ${target}. The gate does not replace it.`,
      };
    }
  }

  mkdirSync(directory, { recursive: true });
  writeFileSync(target, content, { mode: 0o755 });
  chmodSync(target, 0o755);
  return { ok: true, installed: true, path: target, script };
}

/** The mode that Git calls. It returns the exit code of the hook. */
export async function hookCommand(deps = {}) {
  const io = deps.io ?? defaultIo;
  const env = deps.env ?? process.env;
  const root = resolve(deps.cwd ?? process.cwd());
  const git = deps.git ?? createGit(root);

  const bypass = env[bypassVariable];
  if (bypass && bypass !== '0') {
    io.log(`WARNING: ${bypassVariable} is set. The local push gate accepts every ref.`);
    io.log('The job verify still reads the trailer. Emergency use only.');
    return 0;
  }

  const refs = deps.refs ?? parsePushRefs(deps.input ?? readFileSync(0, 'utf8'));
  if (refs.length === 0) return 0;

  const result = await evaluatePush({
    refs,
    git,
    verifySignature: localSignatureVerifier({ git }),
  });

  for (const note of result.notes) io.log(`- Note: ${note}`);
  if (result.ok) {
    io.log('The local push gate accepts this push.');
    return 0;
  }

  io.log('The local push gate rejects this push.');
  for (const failure of result.failures) io.log(`- ${failure}`);
  io.log('Run `pnpm gate -m "type(scope): subject"`. The command checks the change and writes the trailer.');
  io.log(`An emergency push: ${bypassVariable}=1 git push ...`);
  return 1;
}

/** The mode of `pnpm gate:hooks`. */
export function installCommand(argv, deps = {}) {
  const io = deps.io ?? defaultIo;
  const root = resolve(deps.cwd ?? process.cwd());
  const git = deps.git ?? createGit(root);
  const force = argv.includes('--force');

  const result = installHooks({ root, git, force });
  if (!result.ok) {
    io.log(result.reason);
    io.log('Read the refusal above, repair the state, and run `pnpm gate:hooks` again.');
    return 1;
  }
  if (result.installed) {
    io.log(`The local push gate is installed at ${result.path}.`);
    io.log(`The file calls ${result.script}.`);
  } else {
    io.log(`The local push gate is already installed at ${result.path}.`);
  }
  return 0;
}

export async function hookMain(argv, deps = {}) {
  const io = deps.io ?? defaultIo;
  if (argv.includes('-h') || argv.includes('--help')) {
    io.log(usage);
    return 0;
  }
  const options = argv.filter(arg => arg.startsWith('--'));
  const unknown = argv.filter(arg => !arg.startsWith('--'));
  const known = options.filter(arg => !['--install', '--force'].includes(arg));
  if (unknown.length > 0 || known.length > 0) {
    io.log(`Unknown argument: ${unknown[0] ?? known[0]}`);
    io.log(usage);
    return 1;
  }
  if (options.includes('--install')) return installCommand(argv, deps);
  return hookCommand(deps);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = await hookMain(process.argv.slice(2));
}
