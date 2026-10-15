import assert from 'node:assert/strict';
import test from 'node:test';
import { branchRoute, validPullRoute } from './branches.mjs';

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
