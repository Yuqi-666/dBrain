import assert from 'node:assert/strict';
import test from 'node:test';
import { collectEnvironment, changedPaths, parseArgs, runGate, usage } from './run.mjs';
import { commitAll, createRepo, git, write } from './test-helpers.mjs';
import { createGit } from './verify.mjs';

function quietIo(output) {
  return {
    log: message => output.push(message),
    step: message => output.push(`== ${message}`),
  };
}

function stubRun(overrides = {}) {
  return (command, args) => {
    if (command === 'pnpm' && args[0] === '--version') return { status: 0, stdout: '9.0.0\n' };
    return { status: 0, stdout: '', ...overrides };
  };
}

test('the argument parser follows the usage text', () => {
  assert.deepEqual(parseArgs([]), {
    messages: [],
    base: 'main',
    full: false,
    push: true,
    sign: true,
    autoMerge: true,
    allowProtected: false,
    dryRun: false,
    help: false,
  });
  const options = parseArgs(['-m', 'feat: one', '--message', 'body', '--base=develop', '--full', '--no-sign']);
  assert.deepEqual(options.messages, ['feat: one', 'body']);
  assert.equal(options.base, 'develop');
  assert.equal(options.full, true);
  assert.equal(options.sign, false);
  assert.equal(parseArgs(['--no-auto-merge']).autoMerge, false);
  assert.equal(parseArgs(['--dry-run']).push, false, 'a dry run never pushes');
  assert.equal(parseArgs(['--message=x']).messages[0], 'x');
  assert.throws(() => parseArgs(['--nope']), /Unknown option/);
  assert.throws(() => parseArgs(['-m']), /needs a value/);
  assert.ok(usage.includes('pnpm gate'));
});

test('the environment fingerprint names the toolchain', () => {
  const text = collectEnvironment({ GATE_PNPM_VERSION: '9.0.0' });
  assert.match(text, /^node=\d+\.\d+\.\d+ pnpm=9\.0\.0 os=\w+ arch=\w+$/);
  assert.ok(collectEnvironment({}).includes('pnpm=unknown'));
});

test('the changed-path list holds the branch and the index', t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  write(root, 'backend/domain/src/first.ts', 'export const first = 1;\n');
  commitAll(root, 'feat: first');
  write(root, 'backend/domain/src/second.ts', 'export const second = 2;\n');
  git(root, ['add', '-A']);
  assert.deepEqual(changedPaths({ git: createGit(root), base: 'main' }), [
    'backend/domain/src/first.ts',
    'backend/domain/src/second.ts',
  ]);
});

test('a dry run selects the checks, reports, and prints the trailer', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  write(root, 'backend/domain/src/node.ts', 'export const node = 1;\n');
  const head = git(root, ['rev-parse', 'HEAD']);

  const output = [];
  const ran = [];
  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['-m', 'feat(domain): add a node', '--dry-run']),
    git: createGit(root),
    run: stubRun(),
    runCheck: check => {
      ran.push(check.id);
      return { status: 'passed', exitCode: 0, durationMs: 1 };
    },
    io: quietIo(output),
  });

  assert.equal(code, 0);
  assert.deepEqual(ran, ['release-check', 'typecheck', 'lint-gate', 'unit', 'build', 'smoke-server']);
  const text = output.join('\n');
  assert.ok(text.includes('\nGate-Version: 1\n') || text.startsWith('Gate-Version: 1\n'));
  assert.ok(text.includes('\nGate-Checks: '));
  assert.ok(text.includes('Dry run'));
  assert.equal(git(root, ['rev-parse', 'HEAD']), head, 'a dry run commits nothing');
  assert.ok(text.includes('Out of scope'), 'the plan names the skipped checks');
});

test('a failed check stops the gate before the commit', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  write(root, 'backend/domain/src/node.ts', 'export const node = 1;\n');
  const head = git(root, ['rev-parse', 'HEAD']);

  const output = [];
  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['-m', 'feat(domain): add a node', '--no-push', '--no-sign']),
    git: createGit(root),
    run: stubRun(),
    runCheck: () => ({ status: 'failed', exitCode: 1, durationMs: 1 }),
    io: quietIo(output),
  });

  assert.equal(code, 1);
  assert.equal(git(root, ['rev-parse', 'HEAD']), head, 'a failed gate commits nothing');
  assert.ok(output.join('\n').includes('The check release-check failed'));
});

test('a protected branch is refused before the checks', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');

  const output = [];
  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['-m', 'chore: direct change']),
    git: createGit(root),
    run: stubRun(),
    runCheck: () => {
      throw new Error('no check may run on a protected branch');
    },
    io: quietIo(output),
  });

  assert.equal(code, 1);
  assert.ok(output.some(line => line.includes('is protected')));
});

test('an unsigned push is refused when the signature is not configured', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const output = [];
  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['-m', 'chore: sign me']),
    git: createGit(root),
    run: stubRun(),
    runCheck: () => {
      throw new Error('no check may run without a signature');
    },
    io: quietIo(output),
  });
  assert.equal(code, 1);
  assert.ok(output.join('\n').includes('The commit signature is not configured'));
});

test('a dirty run on a protected branch is allowed when asked', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  const output = [];
  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['-m', 'chore: inspect', '--allow-protected', '--dry-run']),
    git: createGit(root),
    run: stubRun(),
    runCheck: () => ({ status: 'passed', exitCode: 0, durationMs: 1 }),
    io: quietIo(output),
  });
  assert.equal(code, 0);
});
