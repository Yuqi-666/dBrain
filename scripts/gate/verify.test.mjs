import assert from 'node:assert/strict';
import test from 'node:test';
import { checks, protocol, protectedPaths, trackedDeny } from './checks.mjs';
import { commitAll, createRepo, gatedCommit, git, write } from './test-helpers.mjs';
import { createGit, githubSignatureVerifier, parseVerifyArgs, verifyGate, verifyMergeGate, verifyPromotionGate, versionIncreases } from './verify.mjs';

const definition = { checks, protocol, protectedPaths, trackedDeny };

test('release versions must advance, including prerelease numbers', () => {
  assert.equal(versionIncreases('0.1.0', '0.1.1'), true);
  assert.equal(versionIncreases('0.1.0', '0.1.0'), false);
  assert.equal(versionIncreases('0.2.0', '0.1.9'), false);
  assert.equal(versionIncreases('0.2.0-rc.2', '0.2.0-rc.10'), true);
  assert.equal(versionIncreases('0.2.0', '0.2.0-rc.1'), false);
});

function deps(root, signature = { verified: true, reason: 'valid', login: 'tester' }) {
  return {
    git: createGit(root),
    verifySignature: async () => signature,
  };
}

function scenario(t, files = { 'backend/domain/src/node.ts': 'export const node = 1;\n' }) {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  const base = commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const head = gatedCommit(root, {
    subject: 'feat(domain): add a node',
    files,
    checks: ['release-check', 'typecheck', 'lint-gate', 'unit', 'build', 'smoke-server'],
  });
  return { root, base, head };
}

test('a gated commit passes', async t => {
  const { root, base, head } = scenario(t);
  const result = await verifyGate(
    { repoDir: root, baseSha: base, headSha: head.sha, requireSignature: true, repository: 'o/r' },
    deps(root),
  );
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
  assert.equal(result.details.tree, head.tree);
  assert.ok(result.details.requiredChecks.includes('typecheck'));
  assert.ok(result.notes.some(note => note.includes('signature is valid')));
});

test('a commit without a trailer fails', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  const base = commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  write(root, 'backend/domain/src/node.ts', 'export const node = 1;\n');
  const sha = commitAll(root, 'feat(domain): a plain commit');
  const result = await verifyGate({ repoDir: root, baseSha: base, headSha: sha }, deps(root));
  assert.equal(result.ok, false);
  assert.ok(result.failures.some(failure => failure.includes('no Gate trailer')));
});

test('a trailer for another tree fails', async t => {
  const { root, base } = scenario(t);
  const head = gatedCommit(root, {
    subject: 'feat(domain): edit again',
    files: { 'backend/domain/src/node.ts': 'export const node = 2;\n' },
    checks: ['release-check', 'typecheck', 'lint-gate', 'unit', 'build', 'smoke-server'],
    tree: 'c'.repeat(40),
  });
  const result = await verifyGate({ repoDir: root, baseSha: base, headSha: head.sha }, deps(root));
  assert.equal(result.ok, false);
  assert.ok(result.failures.some(failure => failure.includes('the commit holds')));
});

test('a trailer with the wrong protocol fails', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  const base = commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const head = gatedCommit(root, {
    subject: 'chore: old client',
    files: { 'docs/a.md': 'text\n' },
    checks: ['release-check'],
    version: 99,
  });
  const result = await verifyGate({ repoDir: root, baseSha: base, headSha: head.sha }, deps(root));
  assert.equal(result.ok, false);
  assert.ok(result.failures.some(failure => failure.includes('protocol')));
});

test('a trailer that misses a required check fails', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  const base = commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const head = gatedCommit(root, {
    subject: 'feat(domain): add a node',
    files: { 'backend/domain/src/node.ts': 'export const node = 1;\n' },
    checks: ['release-check'],
  });
  const result = await verifyGate({ repoDir: root, baseSha: base, headSha: head.sha }, deps(root));
  assert.equal(result.ok, false);
  const failure = result.failures.find(item => item.includes('does not cover'));
  assert.ok(failure, 'a coverage failure exists');
  assert.ok(failure.includes('typecheck') && failure.includes('smoke-server'));
});

test('a manual-only change needs the cheap check only', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  const base = commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const head = gatedCommit(root, {
    subject: 'docs: describe the gate',
    files: { 'docs/ci-cd.md': 'text\n' },
    checks: ['release-check'],
  });
  const result = await verifyGate({ repoDir: root, baseSha: base, headSha: head.sha }, deps(root));
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.details.requiredChecks, ['release-check']);
});

test('a tracked deny-list path fails', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  const base = commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  write(root, 'node_modules/pkg/index.js', 'module.exports = 1;\n');
  git(root, ['add', '-f', 'node_modules/pkg/index.js']);
  const tree = git(root, ['write-tree']);
  git(root, ['commit', '--quiet', '--no-verify', '-m', 'chore: vendor a package']);
  const result = await verifyGate(
    { repoDir: root, baseSha: base, headSha: git(root, ['rev-parse', 'HEAD']) },
    deps(root),
  );
  assert.equal(result.ok, false);
  assert.ok(result.failures.some(failure => failure.includes('node_modules/pkg/index.js')));
  assert.equal(tree.length, 40);
});

test('a change to the gate itself needs an approval', async t => {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  const base = commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  const head = gatedCommit(root, {
    subject: 'chore(gate): relax a rule',
    files: { 'scripts/gate/checks.mjs': 'export const protocol = 1;\n' },
    checks: ['release-check', 'syntax', 'lint-gate', 'unit'],
  });
  const rejected = await verifyGate({ repoDir: root, baseSha: base, headSha: head.sha }, deps(root));
  assert.equal(rejected.ok, false);
  assert.ok(rejected.failures.some(failure => failure.includes('edits the gate itself')));
  const approved = await verifyGate(
    { repoDir: root, baseSha: base, headSha: head.sha, gateChangeApproved: true },
    deps(root),
  );
  assert.deepEqual(approved.failures, []);
});

test('an unsigned commit fails only when the signature is required', async t => {
  const { root, base, head } = scenario(t);
  const unsigned = { verified: false, reason: 'unsigned' };
  const advisory = await verifyGate(
    { repoDir: root, baseSha: base, headSha: head.sha, requireSignature: false },
    deps(root, unsigned),
  );
  assert.equal(advisory.ok, true);
  assert.ok(advisory.notes.some(note => note.includes('not enforced')));
  const strict = await verifyGate(
    { repoDir: root, baseSha: base, headSha: head.sha, requireSignature: true },
    deps(root, unsigned),
  );
  assert.equal(strict.ok, false);
  assert.ok(strict.failures.some(failure => failure.includes('signature is not valid')));
});

test('a missing base commit demands every local check', async t => {
  const { root, base, head } = scenario(t);
  const result = await verifyGate({ repoDir: root, baseSha: '', headSha: head.sha }, deps(root));
  assert.equal(result.ok, false, 'the trailer lists six of the checks only');
  assert.ok(result.details.requiredChecks.includes('syntax'));
  assert.ok(result.notes.some(note => note.includes('No base commit')));
  const full = await verifyGate(
    { repoDir: root, baseSha: '', headSha: base },
    deps(root),
  );
  assert.equal(full.ok, false);
});

test('the argument parser accepts the documented options', () => {
  assert.deepEqual(parseVerifyArgs(['--base=abc', '--head=def', '--advisory']), {
    repository: null,
    base: 'abc',
    head: 'def',
    advisory: true,
    requireSignature: false,
    json: false,
    merge: false,
    headBranch: null,
    baseBranch: null,
  });
  assert.equal(parseVerifyArgs(['--merge']).merge, true);
  assert.throws(() => parseVerifyArgs(['--nope']), /Unknown option/);
});

function mergeScenario(t, { trailer = true } = {}) {
  const root = createRepo(t);
  write(root, 'README.md', '# dBrain\n');
  commitAll(root, 'docs: start');
  git(root, ['checkout', '--quiet', '-b', 'topic']);
  let parent;
  if (trailer) {
    parent = gatedCommit(root, {
      subject: 'feat(domain): add a node',
      files: { 'backend/domain/src/node.ts': 'export const node = 1;\n' },
      checks: ['release-check', 'typecheck'],
    }).sha;
  } else {
    write(root, 'backend/domain/src/node.ts', 'export const node = 1;\n');
    parent = commitAll(root, 'feat(domain): a plain commit');
  }
  git(root, ['checkout', '--quiet', 'main']);
  git(root, ['merge', '--quiet', '--no-ff', '--no-verify', '-m', 'Merge pull request #1', 'topic']);
  return { root, parent, merge: git(root, ['rev-parse', 'HEAD']) };
}

test('a merge from a gated branch passes', async t => {
  const { root, parent, merge } = mergeScenario(t);
  const result = await verifyMergeGate(
    { repoDir: root, headSha: merge, requireSignature: true, repository: 'o/r' },
    deps(root),
  );
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
  assert.equal(result.details.parents.length, 2);
  assert.deepEqual(result.details.gatedParents, [parent]);
});

test('promotion verifies each develop merge and the new release declaration', async t => {
  const root = createRepo(t);
  write(root, 'scripts/release/release.json', JSON.stringify({ version: '0.1.0', desktopTargets: ['linux-x64'], containerPlatforms: ['linux/amd64'] }));
  const main = commitAll(root, 'chore: start');
  git(root, ['checkout', '--quiet', '-b', 'develop']);
  git(root, ['checkout', '--quiet', '-b', 'release/0.2.0']);
  const release = gatedCommit(root, { files: { 'scripts/release/release.json': JSON.stringify({ version: '0.2.0', desktopTargets: ['linux-x64'], containerPlatforms: ['linux/amd64'] }) }, checks: ['release-check'] });
  git(root, ['checkout', '--quiet', 'develop']);
  git(root, ['merge', '--quiet', '--no-ff', '--no-verify', '-m', 'Merge release', 'release/0.2.0']);
  const develop = git(root, ['rev-parse', 'HEAD']);
  const result = await verifyPromotionGate({ repoDir: root, baseSha: main, headSha: develop, requireSignature: true }, deps(root));
  assert.equal(result.ok, true, result.failures.join('\n'));
  assert.equal(result.details.version, '0.2.0');
  assert.equal(release.sha.length, 40);
});

test('promotion refuses an unchanged release version', async t => {
  const root = createRepo(t);
  write(root, 'scripts/release/release.json', JSON.stringify({ version: '0.1.0', desktopTargets: ['linux-x64'], containerPlatforms: ['linux/amd64'] }));
  const main = commitAll(root, 'chore: start');
  git(root, ['checkout', '--quiet', '-b', 'develop']);
  git(root, ['checkout', '--quiet', '-b', 'feature/note']);
  gatedCommit(root, { files: { 'docs/note.md': 'A note.\n' }, checks: ['release-check'] });
  git(root, ['checkout', '--quiet', 'develop']);
  git(root, ['merge', '--quiet', '--no-ff', '--no-verify', '-m', 'Merge note', 'feature/note']);
  const result = await verifyPromotionGate({ repoDir: root, baseSha: main, headSha: git(root, ['rev-parse', 'HEAD']) }, deps(root));
  assert.equal(result.ok, false);
  assert.ok(result.failures.some(failure => failure.includes('increase the release version')));
});

test('a push outside a merge commit fails', async t => {
  const { root, merge } = mergeScenario(t);
  const result = await verifyMergeGate(
    { repoDir: root, headSha: `${merge}^1`, requireSignature: true },
    deps(root),
  );
  assert.equal(result.ok, false);
  assert.ok(result.failures.some(failure => failure.includes('not a merge commit')));
});

test('a merge from an ungated branch fails', async t => {
  const { root, merge } = mergeScenario(t, { trailer: false });
  const result = await verifyMergeGate(
    { repoDir: root, headSha: merge, requireSignature: true },
    deps(root),
  );
  assert.equal(result.ok, false);
  assert.ok(result.failures.some(failure => failure.includes('has no Gate trailer')));
});

test('a merge from an unsigned branch fails only when the signature is required', async t => {
  const { root, merge } = mergeScenario(t);
  const unsigned = { verified: false, reason: 'unsigned' };
  const advisory = await verifyMergeGate({ repoDir: root, headSha: merge }, deps(root, unsigned));
  assert.equal(advisory.ok, true);
  assert.ok(advisory.notes.some(note => note.includes('no enforced signature')));
  const strict = await verifyMergeGate(
    { repoDir: root, headSha: merge, requireSignature: true },
    deps(root, unsigned),
  );
  assert.equal(strict.ok, false);
});

test('the GitHub signature verifier reports a failed request', async () => {
  const unreachable = githubSignatureVerifier({
    token: 't',
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  assert.deepEqual(await unreachable({ repository: 'o/r', sha: 'a'.repeat(40) }), {
    verified: false,
    reason: 'the GitHub API is unreachable (offline)',
  });
  const accepted = githubSignatureVerifier({
    token: 't',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ commit: { verification: { verified: true, reason: 'valid' } }, author: { login: 'tester' } }),
    }),
  });
  assert.deepEqual(await accepted({ repository: 'o/r', sha: 'a'.repeat(40) }), {
    verified: true,
    reason: 'valid',
    login: 'tester',
  });
  const noToken = githubSignatureVerifier({ token: '' });
  assert.equal((await noToken({ repository: 'o/r', sha: 'a' })).verified, false);
});
