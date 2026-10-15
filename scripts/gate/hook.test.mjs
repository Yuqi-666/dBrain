// The tests of the local push gate. They use a temporary bare repository, so
// they never talk to GitHub.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  bypassVariable,
  evaluatePush,
  hookStub,
  installHooks,
  localSignatureVerifier,
  parsePushRefs,
  stubMarker,
} from './hook.mjs';
import { commitAll, createRepo, git, gatedCommit, write } from './test-helpers.mjs';
import { createGit } from './verify.mjs';

const gateDirectory = fileURLToPath(new URL('.', import.meta.url));

function zeros(count = 40) {
  return '0'.repeat(count);
}

function trustedSignature() {
  return async () => ({ verified: true, code: 'G', reason: 'valid', login: 'Gate Test' });
}

function push(cwd, args, env = {}) {
  return spawnSync('git', ['push', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

// The hook resolves its imports in the repository that runs it. A temporary
// repository therefore needs the gate directory. The directory stays out of
// the index, so a checkout never removes the tracked hook script.
function copyGate(root) {
  const target = join(root, 'scripts/gate');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  cpSync(gateDirectory, target, {
    recursive: true,
    filter: source => !source.endsWith('.test.mjs'),
  });
  writeFileSync(join(root, '.git/info/exclude'), 'scripts/gate\n');
  return target;
}

// A temporary SSH key signs the commits of the temporary repository. The test
// never reads the real key of the account.
function trustedLocalKey(root, t) {
  const directory = mkdtempSync(join(tmpdir(), 'dbrain-key-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const key = join(directory, 'signing-key');
  const created = spawnSync(
    'ssh-keygen',
    ['-q', '-t', 'ed25519', '-N', '', '-C', 'gate@dbrain.invalid', '-f', key],
    { encoding: 'utf8' },
  );
  if (created.status !== 0) return false;
  const signers = join(directory, 'allowed_signers');
  writeFileSync(signers, `gate@dbrain.invalid ${readFileSync(`${key}.pub`, 'utf8').trim()}\n`);
  git(root, ['config', 'gpg.format', 'ssh']);
  git(root, ['config', 'user.signingkey', key]);
  git(root, ['config', 'gpg.ssh.allowedSignersFile', signers]);
  git(root, ['config', 'commit.gpgsign', 'true']);
  return true;
}

test('the push ref parser reads the lines of Git', () => {
  assert.deepEqual(
    parsePushRefs('refs/heads/topic aaa111 refs/heads/topic bbb222\n\n   \n'),
    [
      {
        localRef: 'refs/heads/topic',
        localSha: 'aaa111',
        remoteRef: 'refs/heads/topic',
        remoteSha: 'bbb222',
      },
    ],
  );
  assert.deepEqual(parsePushRefs(''), []);
});

test('the signature reader separates an unsigned commit from an unknown key', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  const sha = commitAll(root, 'docs: start');

  const verify = localSignatureVerifier({ git: createGit(root) });
  const result = await verify({ sha });
  assert.equal(result.verified, false);
  assert.equal(result.code, 'N');
  assert.equal(result.reason, 'the commit has no signature');
});

test('the hook refuses a direct write to main and an ungated branch', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  const base = git(root, ['rev-parse', 'HEAD']);
  const gitFn = createGit(root);

  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const gated = gatedCommit(root, {
    files: { 'docs/note.md': 'A note.\n' },
    checks: ['release-check'],
  });

  const direct = await evaluatePush({
    refs: parsePushRefs(`refs/heads/main ${gated.sha} refs/heads/main ${base}`),
    git: gitFn,
    verifySignature: trustedSignature(),
  });
  assert.equal(direct.ok, false);
  assert.match(direct.failures.join(' '), /writes a protected branch directly/);

  const ungated = await evaluatePush({
    refs: parsePushRefs(`refs/heads/topic ${base} refs/heads/topic ${zeros()}`),
    git: gitFn,
    verifySignature: trustedSignature(),
  });
  assert.equal(ungated.ok, false);
  assert.match(ungated.failures.join(' '), /no Gate trailer/);

  const accepted = await evaluatePush({
    refs: parsePushRefs(`refs/heads/topic ${gated.sha} refs/heads/topic ${zeros()}`),
    git: gitFn,
    verifySignature: trustedSignature(),
  });
  assert.equal(accepted.ok, true, accepted.failures.join(' '));

  const removed = await evaluatePush({
    refs: parsePushRefs(`(delete) ${zeros()} refs/heads/topic ${gated.sha}`),
    git: gitFn,
    verifySignature: trustedSignature(),
  });
  assert.equal(removed.ok, true);
  assert.match(removed.notes.join(' '), /deletes refs\/heads\/topic/);
});

test('the hook refuses an unsigned tip', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const gated = gatedCommit(root, {
    files: { 'docs/note.md': 'A note.\n' },
    checks: ['release-check'],
  });
  const gitFn = createGit(root);

  const result = await evaluatePush({
    refs: parsePushRefs(`refs/heads/topic ${gated.sha} refs/heads/topic ${zeros()}`),
    git: gitFn,
    verifySignature: localSignatureVerifier({ git: gitFn }),
  });
  assert.equal(result.ok, false);
  assert.match(result.failures.join(' '), /no signature/);
});

test('the installer writes the hook file once', t => {
  const root = createRepo(t);
  copyGate(root);
  const gitFn = createGit(root);

  const first = installHooks({ root, git: gitFn });
  assert.equal(first.ok, true);
  assert.equal(first.installed, true);
  assert.ok(existsSync(first.path), first.path);
  assert.ok((statSync(first.path).mode & 0o111) !== 0, 'the hook file must be executable');
  assert.ok(readFileSync(first.path, 'utf8').includes(stubMarker));
  assert.ok(readFileSync(first.path, 'utf8').includes(first.script));

  const second = installHooks({ root, git: gitFn });
  assert.equal(second.ok, true);
  assert.equal(second.installed, false);

  writeFileSync(first.path, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  const refused = installHooks({ root, git: gitFn });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /Another hook owns/);

  const forced = installHooks({ root, git: gitFn, force: true });
  assert.equal(forced.ok, true);
  assert.equal(forced.installed, true);

  git(root, ['config', '--local', 'core.hooksPath', '/somewhere/else']);
  const shadowed = installHooks({ root, git: gitFn });
  assert.equal(shadowed.ok, false);
  assert.match(shadowed.reason, /core\.hooksPath is set/);
});

test('the stub refuses a checkout that holds no hook script', t => {
  const root = createRepo(t);
  const stub = join(root, '.git/hooks/pre-push');
  writeFileSync(stub, hookStub(root), { mode: 0o755 });

  const missing = spawnSync(stub, [], { encoding: 'utf8', input: '' });
  assert.notEqual(missing.status, 0, 'a missing script must refuse the push');
  assert.match(missing.stderr, /local push gate is missing/);

  copyGate(root);
  const present = spawnSync(stub, [], { encoding: 'utf8', input: '' });
  assert.equal(present.status, 0, present.stderr);
});

test('Git runs the hook and refuses an ungated push', async t => {
  const origin = mkdtempSync(join(tmpdir(), 'dbrain-origin-'));
  t.after(() => rmSync(origin, { recursive: true, force: true }));
  git(origin, ['init', '--bare', '--quiet', '--initial-branch=main']);

  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['remote', 'add', 'origin', origin]);
  git(root, ['push', '--quiet', '--set-upstream', 'origin', 'main']);

  if (!trustedLocalKey(root, t)) {
    t.skip('ssh-keygen is unavailable');
    return;
  }

  copyGate(root);
  const installed = installHooks({ root, git: createGit(root) });
  assert.equal(installed.ok, true);
  assert.equal(installed.installed, true);
  assert.ok(existsSync(installed.path), installed.path);

  git(root, ['checkout', '--quiet', '-b', 'topic']);
  write(root, 'docs/topic.md', 'A topic.\n');
  commitAll(root, 'docs: topic');
  const refused = push(root, ['origin', 'topic']);
  assert.notEqual(refused.status, 0, 'an ungated branch must not reach the origin');
  assert.match(refused.stderr, /local push gate rejects/);
  assert.match(refused.stderr, /no Gate trailer/);

  git(root, ['checkout', '--quiet', 'main']);
  git(root, ['checkout', '--quiet', '-b', 'gated']);
  gatedCommit(root, { files: { 'docs/gated.md': 'A gated note.\n' }, checks: ['release-check'] });
  const accepted = push(root, ['origin', 'gated']);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(git(origin, ['rev-parse', 'refs/heads/gated']), git(root, ['rev-parse', 'HEAD']));

  git(root, ['checkout', '--quiet', 'main']);
  commitAll(root, 'docs: move main');
  const direct = push(root, ['origin', 'main']);
  assert.notEqual(direct.status, 0, 'a direct write to main must not reach the origin');
  assert.match(direct.stderr, /writes a protected branch directly/);

  const bypassed = push(root, ['origin', 'main'], { [bypassVariable]: '1' });
  assert.equal(bypassed.status, 0, bypassed.stderr);
  assert.match(bypassed.stderr, /accepts every ref/);
});
