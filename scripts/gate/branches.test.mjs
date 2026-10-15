import assert from 'node:assert/strict';
import test from 'node:test';
import { branchRoute, promotionMergeProblem, validPullRoute } from './branches.mjs';
import { commitAll, createRepo, git, write } from './test-helpers.mjs';
import { createGit } from './verify.mjs';

test('branch routes follow the development, hotfix, and promotion policy', () => {
  assert.deepEqual(branchRoute('feature/search'), { kind: 'development', bases: ['develop'] });
  assert.deepEqual(branchRoute('fix/editor'), { kind: 'development', bases: ['develop'] });
  assert.deepEqual(branchRoute('hotfix/login'), { kind: 'hotfix', bases: ['main', 'develop'] });
  assert.deepEqual(branchRoute('develop'), { kind: 'promotion', bases: ['main'] });
  assert.equal(branchRoute('main'), null);
  assert.equal(validPullRoute('feature/search', 'main'), false);
  assert.equal(validPullRoute('hotfix/login', 'main'), true);
  assert.equal(validPullRoute('hotfix/login', 'develop'), true);
  assert.equal(validPullRoute('develop', 'main'), true);
});

test('a previous main promotion does not require a history sync', t => {
  const root = createRepo(t);
  write(root, 'version.txt', '0.1.0\n');
  commitAll(root, 'start');
  git(root, ['branch', 'develop']);
  git(root, ['checkout', '--quiet', 'develop']);
  write(root, 'feature.txt', 'ready\n');
  commitAll(root, 'feature');
  git(root, ['checkout', '--quiet', 'main']);
  git(root, ['merge', '--quiet', '--no-ff', '--no-verify', '-m', 'previous promotion', 'develop']);
  const main = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', '--quiet', 'develop']);
  write(root, 'version.txt', '0.2.0\n');
  const develop = commitAll(root, 'next version');
  assert.notEqual(git(root, ['merge-base', main, develop]), main);
  assert.equal(promotionMergeProblem(createGit(root), main, develop), null);
});

test('promotion rejects main-only content and merge conflicts', t => {
  const root = createRepo(t);
  write(root, 'config.txt', 'original\n');
  commitAll(root, 'start');
  git(root, ['branch', 'develop']);
  write(root, 'main-only.txt', 'production\n');
  const main = commitAll(root, 'main change');
  git(root, ['checkout', '--quiet', 'develop']);
  write(root, 'version.txt', '0.2.0\n');
  const develop = commitAll(root, 'next version');
  assert.match(promotionMergeProblem(createGit(root), main, develop), /content missing/);
  write(root, 'config.txt', 'develop\n');
  const conflictingDevelop = commitAll(root, 'develop config');
  git(root, ['checkout', '--quiet', 'main']);
  write(root, 'config.txt', 'main\n');
  const conflictingMain = commitAll(root, 'main config');
  assert.match(promotionMergeProblem(createGit(root), conflictingMain, conflictingDevelop), /Cannot safely merge/);
});
