import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import {
  autoMergeDecision,
  collectEnvironment,
  changedPaths,
  parseArgs,
  requiresCheck,
  runGate,
  usage,
} from './run.mjs';
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
    hooks: true,
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

const requiresVerify = () => ({
  status: 0,
  stdout: '{"required_status_checks":{"contexts":["verify"]}}',
});

test('a change to the gate itself never arms auto-merge', () => {
  const decision = autoMergeDecision({
    run: requiresVerify,
    paths: ['scripts/gate/run.mjs', 'docs/ci-cd.md'],
    repository: 'o/r',
    branch: 'main',
  });
  assert.equal(decision.arm, false);
  assert.ok(decision.reason.includes('gate-change'), 'the reason names the label');
  assert.ok(decision.reason.includes('scripts/gate/run.mjs'), 'the reason names the file');
});

test('a repository that cannot require the check never arms auto-merge', () => {
  const refused = () => ({ status: 1, stdout: '', stderr: 'Upgrade to GitHub Pro' });
  const decision = autoMergeDecision({
    run: refused,
    paths: ['backend/domain/src/node.ts'],
    repository: 'o/r',
    branch: 'main',
  });
  assert.equal(decision.arm, false);
  assert.ok(decision.reason.includes('by hand'));
});

test('a plain change arms auto-merge when the check is required', () => {
  const decision = autoMergeDecision({
    run: requiresVerify,
    paths: ['backend/domain/src/node.ts'],
    repository: 'o/r',
    branch: 'main',
  });
  assert.deepEqual(decision, { arm: true, reason: null });
});

test('a change under the gate paths is found through the pattern list', () => {
  const decision = autoMergeDecision({
    run: requiresVerify,
    definition: { protectedPaths: ['scripts/gate/**'] },
    paths: ['backend/domain/src/node.ts', '.github/workflows/gate.yml'],
    repository: 'o/r',
  });
  assert.deepEqual(decision, { arm: true, reason: null }, 'the custom list does not hold that file');
  const caught = autoMergeDecision({
    run: requiresVerify,
    definition: { protectedPaths: ['.github/workflows/gate.yml'] },
    paths: ['.github/workflows/gate.yml'],
    repository: 'o/r',
  });
  assert.equal(caught.arm, false);
});

test('the required check is read from branch protection', () => {
  assert.equal(requiresCheck(requiresVerify, { repository: 'o/r' }), true);
  assert.equal(requiresCheck(() => ({ status: 1, stderr: 'no' }), { repository: 'o/r' }), false);
  assert.equal(requiresCheck(() => ({ status: 0, stdout: '[]' }), { repository: 'o/r' }), false);
  assert.equal(
    requiresCheck(
      () => ({ status: 0, stdout: '{"required_status_checks":{"contexts":["other"]}}' }),
      { repository: 'o/r' },
    ),
    false,
    'another check does not count',
  );
  assert.equal(requiresCheck(requiresVerify, { repository: '' }), false, 'no repository, no answer');
});

test('the required check is read from a ruleset that covers the branch', () => {
  const ruleset = {
    conditions: { ref_name: { include: ['refs/heads/main'] } },
    rules: [
      {
        type: 'required_status_checks',
        parameters: { required_status_checks: [{ context: 'verify', integration_id: 15368 }] },
      },
    ],
  };
  const run = (command, args) => {
    const target = args[1];
    if (target.endsWith('/protection')) return { status: 1, stderr: 'Resource not accessible' };
    if (target.endsWith('/rulesets')) return { status: 0, stdout: '[{"id":9,"enforcement":"active"}]' };
    if (target.endsWith('/rulesets/9')) return { status: 0, stdout: JSON.stringify(ruleset) };
    return { status: 1, stdout: '' };
  };
  assert.equal(requiresCheck(run, { repository: 'o/r' }), true);
  assert.equal(requiresCheck(run, { repository: 'o/r', branch: 'develop' }), false);
  const inactive = (command, args) =>
    args[1].endsWith('/rulesets') ? { status: 0, stdout: '[{"id":9,"enforcement":"disabled"}]' } : run(command, args);
  assert.equal(requiresCheck(inactive, { repository: 'o/r' }), false, 'a disabled ruleset enforces nothing');
});

test('a push without the local brake stops before the checks', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  git(root, ['config', 'gpg.format', 'ssh']);
  git(root, ['config', 'user.signingkey', join(root, 'absent.pub')]);
  const output = [];

  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['-m', 'docs: change']),
    git: createGit(root),
    run: stubRun(),
    io: quietIo(output),
    env: {},
  });

  const text = output.join('\n');
  assert.equal(code, 1);
  assert.match(text, /stopped before the checks/);
  assert.match(text, /scripts\/gate\/hooks\/pre-push is missing/);
});

test('the option --no-hooks runs without the local brake', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const output = [];
  const run = (command, args) => {
    if (command === 'pnpm' && args[0] === '--version') return { status: 0, stdout: '9.0.0\n' };
    if (command === 'gh' && args[1] === 'view') return { status: 1, stderr: 'no pull requests found' };
    if (command === 'gh' && args[1] === 'create') {
      return { status: 0, stdout: 'https://github.com/o/r/pull/1\n' };
    }
    return { status: 0, stdout: '' };
  };

  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['-m', 'docs: change', '--no-hooks', '--no-sign', '--no-auto-merge']),
    git: createGit(root),
    run,
    runCheck: async () => ({ status: 'passed', exitCode: 0, durationMs: 1 }),
    io: quietIo(output),
    env: { GITHUB_REPOSITORY: 'o/r' },
  });

  const text = output.join('\n');
  assert.equal(code, 0, text);
  assert.match(text, /Check plan/);
  assert.doesNotMatch(text, /is missing/);
});

test('a merged pull request on the branch leaves a new pull request to the gate', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const output = [];
  const calls = [];
  const run = (command, args) => {
    calls.push([command, ...args].join(' '));
    if (command === 'pnpm' && args[0] === '--version') return { status: 0, stdout: '9.0.0\n' };
    if (command === 'gh' && args[1] === 'view') {
      return {
        status: 0,
        stdout: JSON.stringify({
          number: 21,
          url: 'https://github.com/o/r/pull/21',
          state: 'MERGED',
        }),
      };
    }
    if (command === 'gh' && args[1] === 'create') {
      return { status: 0, stdout: 'https://github.com/o/r/pull/22\n' };
    }
    return { status: 0, stdout: '' };
  };

  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['-m', 'docs: change', '--no-hooks', '--no-sign', '--no-auto-merge']),
    git: createGit(root),
    run,
    runCheck: async () => ({ status: 'passed', exitCode: 0, durationMs: 1 }),
    io: quietIo(output),
    env: { GITHUB_REPOSITORY: 'o/r' },
  });

  const text = output.join('\n');
  assert.equal(code, 0, text);
  assert.ok(
    calls.some(call => call.startsWith('gh pr create')),
    'the gate opens a new pull request',
  );
  assert.ok(
    !calls.some(call => call.startsWith('gh pr edit')),
    'the gate does not edit the merged pull request',
  );
  assert.match(text, /Pull request https:\/\/github\.com\/o\/r\/pull\/22/);
});
