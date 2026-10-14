import assert from 'node:assert/strict';
import test from 'node:test';
import { checks, protocol, protectedPaths, trackedDeny } from './checks.mjs';
import { allLocalCheckIds, globToRegExp, localChecks } from './scope.mjs';

const definition = { checks, protocol, protectedPaths, trackedDeny };

test('the definition is well formed', () => {
  assert.ok(Number.isSafeInteger(protocol) && protocol >= 1);
  const ids = checks.map(check => check.id);
  assert.equal(new Set(ids).size, ids.length, 'check ids are unique');
  for (const check of checks) {
    assert.match(check.id, /^[a-z][a-z0-9-]*$/);
    assert.equal(check.runner, 'local', `${check.id} runner`);
    assert.equal(typeof check.required, 'boolean', `${check.id} required`);
    assert.ok(Array.isArray(check.scope) && check.scope.length > 0, `${check.id} scope`);
    assert.ok(check.description.length > 0, `${check.id} description`);
    assert.equal(typeof check.command, 'string', `${check.id} command`);
    for (const glob of check.scope) assert.doesNotThrow(() => globToRegExp(glob), `${check.id} ${glob}`);
  }
  for (const rule of trackedDeny) {
    assert.doesNotThrow(() => new RegExp(rule.pattern), rule.pattern);
    assert.ok(rule.reason.length > 0, rule.pattern);
  }
  assert.ok(protectedPaths.length > 0);
});

test('every local check runs the workspace through a pnpm or node command', () => {
  for (const check of localChecks(definition)) {
    assert.match(check.command, /^(pnpm |bash |for file in )/, check.id);
  }
});

test('the full run covers every check', () => {
  assert.deepEqual(allLocalCheckIds(definition), localChecks(definition).map(check => check.id));
  assert.ok(allLocalCheckIds(definition).includes('build'));
  // No declared check waits for a clean runner.
  assert.equal(allLocalCheckIds(definition).length, checks.length);
});
