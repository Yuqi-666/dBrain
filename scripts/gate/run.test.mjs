import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  autoMergeDecision,
  collectEnvironment,
  changedPaths,
  parseArgs,
  promptGateOptions,
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
    base: null,
    desktopTargets: null,
    containerPlatforms: null,
    version: null,
    full: false,
    sign: true,
    allowProtected: false,
    hooks: true,
    until: 'merge',
    help: false,
  });
  const options = parseArgs(['--until=merge', '-m', 'feat: one', '--message', 'body', '--base=develop', '--full', '--no-sign']);
  assert.deepEqual(options.messages, ['feat: one', 'body']);
  assert.equal(options.base, 'develop');
  assert.equal(options.full, true);
  assert.equal(options.sign, false);
  assert.equal(parseArgs(['--until=pr']).until, 'pr');
  assert.throws(() => parseArgs(['--dry-run']), /Unknown option/);
  assert.equal(parseArgs(['--until=check']).until, 'check');
  assert.equal(parseArgs(['--until', 'pr']).until, 'pr');
  assert.throws(() => parseArgs(['--until=nope']), /Unknown gate stage/);
  assert.equal(parseArgs(['--until=commit', '--message=x']).messages[0], 'x');
  const release = parseArgs(['--until=pr', '--version=0.2.0', '--desktop-targets=linux-x64', '--container-platforms=linux/amd64']);
  assert.equal(release.version, '0.2.0');
  assert.equal(release.desktopTargets, 'linux-x64');
  assert.equal(release.containerPlatforms, 'linux/amd64');
  assert.throws(() => parseArgs(['-m', 'feat: one']), /must choose a stopping stage/);
  assert.throws(() => parseArgs(['--nope']), /Unknown option/);
  assert.throws(() => parseArgs(['--until=commit', '-m']), /needs a value/);
  assert.ok(usage.includes('pnpm gate'));
});

test('the human prompt asks for each needed input', async () => {
  const questions = [];
  const replies = ['pr', '', 'yes', 'feat(gate): one path', 'A short body'];
  const options = await promptGateOptions({ branch: 'topic', ask: async text => {
    questions.push(text);
    return replies.shift();
  } });
  assert.equal(options.until, 'pr');
  assert.equal(options.base, null);
  assert.equal(options.full, true);
  assert.deepEqual(options.messages, ['feat(gate): one path', 'A short body']);
  assert.equal(questions.length, 5);
  const plan = await promptGateOptions({ branch: 'topic', ask: async () => '' });
  assert.equal(plan.until, 'plan');
  assert.deepEqual(plan.messages, []);
});

test('automation requires a subject only from the commit stage', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const calls = [];
  const output = [];
  const code = await runGate(['--until=check'], {
    cwd: root,
    git: createGit(root),
    run: stubRun(),
    runCheck: check => { calls.push(check.id); return { status: 'passed', exitCode: 0, durationMs: 1 }; },
    io: quietIo(output),
  });
  assert.equal(code, 0);
  assert.deepEqual(calls, ['release-check']);
  assert.match(output.join('\n'), /Stopped at check/);
  assert.equal(git(root, ['log', '-1', '--format=%s']), 'docs: start');

  const rejected = await runGate(['--until=commit'], {
    cwd: root,
    run: stubRun(),
    io: quietIo(output),
  });
  assert.equal(rejected, 1);
  assert.match(output.join('\n'), /subject is required/);
});

test('the merge stage requests auto-merge after opening a PR', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const calls = [];
  const run = (command, args) => {
    calls.push([command, ...args].join(' '));
    if (command === 'pnpm') return { status: 0, stdout: '9.0.0\n' };
    if (command === 'gh' && args[0] === 'repo') return { status: 0, stdout: 'o/r\n' };
    if (command === 'gh' && args[1]?.endsWith('/protection')) {
      return { status: 0, stdout: '{"required_status_checks":{"contexts":["verify"]}}' };
    }
    if (command === 'gh' && args[0] === 'pr' && args[1] === 'create') {
      return { status: 0, stdout: 'https://github.com/o/r/pull/1\n' };
    }
    return { status: 0, stdout: '' };
  };
  const output = [];
  const code = await runGate(['--until=merge', '-m', 'docs: one flow', '--no-hooks', '--no-sign'], {
    cwd: root,
    git: createGit(root),
    run,
    runCheck: () => ({ status: 'passed', exitCode: 0, durationMs: 1 }),
    io: quietIo(output),
  });
  assert.equal(code, 0, output.join('\n'));
  assert.ok(calls.some(call => call.startsWith('gh pr merge https://github.com/o/r/pull/1 --auto --merge')));
  assert.match(output.join('\n'), /merge: auto-merge requested/);
});

test('the environment fingerprint names the toolchain', () => {
  const text = collectEnvironment({ GATE_PNPM_VERSION: '9.0.0' });
  assert.match(text, /^node=\d+\.\d+\.\d+ pnpm=9\.0\.0 os=\w+ arch=\w+$/);
  assert.ok(collectEnvironment({}).includes('pnpm=unknown'));
});

test('a hotfix opens pull requests to both protected branches', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  write(root, 'scripts/release/release.json', JSON.stringify({ version: '0.1.0', desktopTargets: ['linux-x64'], containerPlatforms: ['linux/amd64'] }));
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'hotfix/login']);
  const calls = [];
  const output = [];
  const run = (command, args) => {
    calls.push([command, ...args].join(' '));
    if (command === 'pnpm') return { status: 0, stdout: '9.0.0\n' };
    if (command === 'gh' && args[1] === 'list') return { status: 0, stdout: '[]' };
    if (command === 'gh' && args[1] === 'create') return { status: 0, stdout: `https://github.com/o/r/pull/${calls.length}\n` };
    return { status: 0, stdout: '' };
  };
  const code = await runGate(['--until=pr', '-m', 'fix: login', '--version=0.2.0', '--no-hooks', '--no-sign'], {
    cwd: root, git: createGit(root), run,
    runCheck: () => ({ status: 'passed', exitCode: 0, durationMs: 1 }), io: quietIo(output),
  });
  assert.equal(code, 0, output.join('\n'));
  const created = calls.filter(call => call.startsWith('gh pr create'));
  assert.equal(created.length, 2);
  assert.ok(created[0].includes('--base main'));
  assert.ok(created[1].includes('--base develop'));
  assert.match(output.join('\n'), /Checks: .*smoke-server/);
});

test('release planning lists the version files without changing them', async t => {
  const root = createRepo(t);
  write(root, 'scripts/release/release.json', JSON.stringify({ version: '0.1.0', desktopTargets: ['linux-x64'], containerPlatforms: ['linux/amd64'] }));
  commitAll(root, 'chore: start');
  git(root, ['branch', 'develop']);
  git(root, ['checkout', '--quiet', '-b', 'release/0.2.0']);
  const output = [];
  const code = await runGate(['--until=plan', '--version=0.2.0', '--desktop-targets=linux-x64', '--container-platforms=linux/amd64'], {
    cwd: root, git: createGit(root), run: stubRun(), io: quietIo(output),
  });
  assert.equal(code, 0, output.join('\n'));
  assert.match(output.join('\n'), /Release v0\.2\.0/);
  assert.equal(git(root, ['status', '--porcelain']), '');
});

test('release planning rejects an occupied tag before changing files', async t => {
  const root = createRepo(t);
  write(root, 'scripts/release/release.json', JSON.stringify({ version: '0.1.0', desktopTargets: ['linux-x64'], containerPlatforms: ['linux/amd64'] }));
  commitAll(root, 'chore: start');
  git(root, ['branch', 'develop']);
  git(root, ['checkout', '--quiet', '-b', 'release/0.2.0']);
  const output = [];
  const run = (command, args) => command === 'git' && args[0] === 'ls-remote'
    ? { status: 0, stdout: `${'a'.repeat(40)}\trefs/tags/v0.2.0\n` }
    : { status: 0, stdout: command === 'pnpm' ? '9.0.0\n' : '' };
  const code = await runGate(['--until=plan', '--version=0.2.0', '--desktop-targets=linux-x64', '--container-platforms=linux/amd64'], {
    cwd: root, git: createGit(root), run, io: quietIo(output),
  });
  assert.equal(code, 1);
  assert.match(output.join('\n'), /Tag v0\.2\.0 already exists/);
  assert.equal(git(root, ['status', '--porcelain']), '');
});

test('bootstrap into main covers the checks required by the develop push hook', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['branch', 'develop']);
  git(root, ['checkout', '--quiet', '-b', 'ci/bootstrap']);
  write(root, 'scripts/gate/branches.mjs', 'export const ready = true;\n');
  const output = [];
  const code = await runGate(['--until=plan', '--base=main'], {
    cwd: root, git: createGit(root), run: stubRun(), io: quietIo(output),
  });
  assert.equal(code, 0, output.join('\n'));
  assert.match(output.join('\n'), /Checks: .*repository-yaml.*typecheck.*build.*smoke-server/);
});

test('release checking writes the selected platform declaration before checks', async t => {
  const root = createRepo(t);
  write(root, 'scripts/release/release.json', JSON.stringify({ version: '0.1.0', desktopTargets: ['linux-x64'], containerPlatforms: ['linux/amd64'] }));
  commitAll(root, 'chore: start');
  git(root, ['branch', 'develop']);
  git(root, ['checkout', '--quiet', '-b', 'release/0.2.0']);
  const calls = [];
  const output = [];
  const run = (command, args) => {
    calls.push([command, ...args].join(' '));
    if (command === 'pnpm') return { status: 0, stdout: '9.0.0\n' };
    return { status: 0, stdout: '' };
  };
  const code = await runGate(['--until=check', '--version=0.2.0', '--desktop-targets=linux-x64,win32-x64', '--container-platforms=linux/amd64,linux/arm64'], {
    cwd: root, git: createGit(root), run,
    runCheck: () => ({ status: 'passed', exitCode: 0, durationMs: 1 }), io: quietIo(output),
  });
  assert.equal(code, 0, output.join('\n'));
  assert.ok(calls.includes('node scripts/release/version.mjs 0.2.0'));
  const declaration = JSON.parse(readFileSync(resolve(root, 'scripts/release/release.json'), 'utf8'));
  assert.deepEqual(declaration.desktopTargets, ['linux-x64', 'win32-x64']);
  assert.deepEqual(declaration.containerPlatforms, ['linux/amd64', 'linux/arm64']);
});

test('release gate disables one product family while keeping the trusted platform catalog', async t => {
  const root = createRepo(t);
  write(root, 'scripts/release/release.json', JSON.stringify({ version: '0.1.0', desktopTargets: ['linux-x64'], containerPlatforms: ['linux/amd64'] }));
  commitAll(root, 'chore: start');
  git(root, ['branch', 'develop']);
  git(root, ['checkout', '--quiet', '-b', 'release/0.2.0']);
  const output = [];
  const code = await runGate(['--until=check', '--version=0.2.0', '--desktop-targets=none', '--container-platforms=linux/amd64'], {
    cwd: root, git: createGit(root), run: stubRun(),
    runCheck: () => ({ status: 'passed', exitCode: 0, durationMs: 1 }), io: quietIo(output),
  });
  assert.equal(code, 0, output.join('\n'));
  const declaration = JSON.parse(readFileSync(resolve(root, 'scripts/release/release.json'), 'utf8'));
  assert.deepEqual(declaration.desktopTargets, ['linux-x64']);
  assert.equal(declaration.desktopEnabled, false);
  assert.equal(declaration.containerEnabled, true);
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

test('the plan stage does not stage files or run checks', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  write(root, 'backend/domain/src/node.ts', 'export const node = 1;\n');
  const head = git(root, ['rev-parse', 'HEAD']);
  const indexBefore = git(root, ['ls-files', '--stage']);

  const output = [];
  const ran = [];
  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['--until=plan']),
    git: createGit(root),
    run: stubRun(),
    runCheck: check => { ran.push(check.id); throw new Error('dry run must not run checks'); },
    io: quietIo(output),
  });

  assert.equal(code, 0);
  assert.deepEqual(ran, []);
  const text = output.join('\n');
  assert.ok(text.includes('Checks: release-check, typecheck, lint-gate, unit, build, smoke-server'));
  assert.ok(text.includes('Stopped at plan'));
  assert.equal(git(root, ['rev-parse', 'HEAD']), head, 'a dry run commits nothing');
  assert.equal(git(root, ['ls-files', '--stage']), indexBefore, 'a dry run leaves the index alone');
  assert.equal(git(root, ['status', '--porcelain']).trim(), '?? backend/', 'the file stays untracked');
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
    options: parseArgs(['--until=commit', '-m', 'feat(domain): add a node', '--no-sign']),
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
    options: parseArgs(['--until=merge', '-m', 'chore: direct change']),
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
    options: parseArgs(['--until=merge', '-m', 'chore: sign me']),
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
    options: parseArgs(['--until=plan', '--allow-protected']),
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
    options: parseArgs(['--until=merge', '-m', 'docs: change']),
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
    options: parseArgs(['--until=pr', '-m', 'docs: change', '--no-hooks', '--no-sign']),
    git: createGit(root),
    run,
    runCheck: async () => ({ status: 'passed', exitCode: 0, durationMs: 1 }),
    io: quietIo(output),
    env: { GITHUB_REPOSITORY: 'o/r' },
  });

  const text = output.join('\n');
  assert.equal(code, 0, text);
  assert.match(text, /plan:/);
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
    if (command === 'gh' && args[1] === 'list') {
      return { status: 0, stdout: '[]' };
    }
    if (command === 'gh' && args[1] === 'create') {
      return { status: 0, stdout: 'https://github.com/o/r/pull/22\n' };
    }
    return { status: 0, stdout: '' };
  };

  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['--until=pr', '-m', 'docs: change', '--no-hooks', '--no-sign']),
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
    !calls.some(call => call.includes('/pulls/21')),
    'the gate does not touch the merged pull request',
  );
  assert.match(text, /pr: topic → develop https:\/\/github\.com\/o\/r\/pull\/22/);
});

test('an open pull request keeps the title and the body of the last gate run', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const output = [];
  const calls = [];
  const run = (command, args, options = {}) => {
    calls.push({ line: [command, ...args].join(' '), input: options.input });
    if (command === 'pnpm' && args[0] === '--version') return { status: 0, stdout: '9.0.0\n' };
    if (command === 'gh' && args[1] === 'list') {
      return {
        status: 0,
        stdout: JSON.stringify([{
          number: 22,
          url: 'https://github.com/o/r/pull/22',
          state: 'OPEN',
        }]),
      };
    }
    return { status: 0, stdout: '' };
  };

  const code = await runGate([], {
    cwd: root,
    options: parseArgs(['--until=pr', '-m', 'docs: change', '--no-hooks', '--no-sign']),
    git: createGit(root),
    run,
    runCheck: async () => ({ status: 'passed', exitCode: 0, durationMs: 1 }),
    io: quietIo(output),
    env: { GITHUB_REPOSITORY: 'o/r' },
  });

  const text = output.join('\n');
  assert.equal(code, 0, text);
  const edit = calls.find(call => call.line.startsWith('gh api --method PATCH'));
  assert.ok(edit, 'the gate patches the open pull request');
  assert.match(edit.line, /repos\/\{owner\}\/\{repo\}\/pulls\/22 --input -$/);
  const body = JSON.parse(edit.input);
  assert.equal(body.title, 'docs: change');
  assert.match(body.body, /Gate-Tree: [0-9a-f]{40}/);
});
