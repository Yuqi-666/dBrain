import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMessage, buildTrailers, parseTrailers, reportDigest, stableStringify } from './attest.mjs';

const record = {
  version: 1,
  tree: 'a'.repeat(40),
  checks: ['release-check', 'typecheck', 'build'],
  env: 'node=24.15.0 pnpm=9.0.0 os=linux arch=x64',
  report: `sha256:${'b'.repeat(64)}`,
  runAt: '2026-01-01T00:00:00.000Z',
};

test('a trailer block survives a round trip', () => {
  const message = buildMessage('feat(scope): add the gate', 'A longer body.', buildTrailers(record));
  const parsed = parseTrailers(message);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.tree, record.tree);
  assert.deepEqual(parsed.checks, record.checks);
  assert.equal(parsed.env, record.env);
  assert.equal(parsed.report, record.report);
  assert.equal(parsed.runAt, record.runAt);
  assert.ok(message.startsWith('feat(scope): add the gate\n\nA longer body.\n\nGate-Version: 1\n'));
});

test('a message without a gate line returns null', () => {
  assert.equal(parseTrailers('feat(scope): a plain commit'), null);
  assert.equal(parseTrailers(''), null);
});

test('a malformed trailer is readable and incomplete', () => {
  const parsed = parseTrailers('chore: x\n\nGate-Version: 1\n');
  assert.equal(parsed.version, 1);
  assert.equal(parsed.tree, '');
  assert.deepEqual(parsed.checks, []);
  assert.ok(Number.isNaN(parseTrailers('chore: x\n\nGate-Tree: abc\n').version));
});

test('the trailer tolerates extra spacing and an empty check list', () => {
  const parsed = parseTrailers('chore: x\n\nGate-Version:   1\nGate-Checks:\nGate-Tree:\tabc\n');
  assert.equal(parsed.version, 1);
  assert.equal(parsed.tree, 'abc');
  assert.deepEqual(parsed.checks, []);
});

test('the report digest is stable and content sensitive', () => {
  const first = { b: 2, a: [1, { d: 4, c: 3 }] };
  const second = { a: [1, { c: 3, d: 4 }], b: 2 };
  assert.equal(reportDigest(first), reportDigest(second));
  assert.notEqual(reportDigest(first), reportDigest({ b: 3, a: first.a }));
  assert.match(reportDigest(first), /^sha256:[a-f0-9]{64}$/);
  assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
});
