import assert from 'node:assert/strict';
import test from 'node:test';
import { scopeForEvent, scopeForPaths } from './ci-scope.mjs';

test('documentation-only changes skip expensive jobs; mixed code still validates', () => {
  const docs = ['README.md', 'docs/release-acceptance/v0.1.0.json', 'LICENSE', '.github/dependabot.yml'];
  assert.deepEqual(scopeForPaths(docs), { check: false, containers: false });
  assert.deepEqual(scopeForPaths([...docs, 'backend/domain/src/node.ts']), { check: true, containers: true });
  assert.deepEqual(scopeForPaths([
    ...Array.from({ length: 500 }, (_, index) => `docs/${index}.md`), 'pnpm-lock.yaml',
  ]), { check: true, containers: true });
});

test('desktop-only changes retain quality checks without building containers', () => {
  assert.deepEqual(scopeForPaths(['apps/desktop/src-tauri/Cargo.lock', 'rust-toolchain.toml']), {
    check: true, containers: false,
  });
});

test('shared sources, locks, workflows and unknown files require full CI', () => {
  for (const path of ['pnpm-lock.yaml', '.node-version', 'packages/ui/src/a.tsx',
    'pb/pb_migrations/a.js', 'deploy/nginx.conf', '.github/workflows/ci.yml',
    'scripts/release/ci-scope.mjs', 'future-runtime/config.json']) {
    assert.deepEqual(scopeForPaths([path]), { check: true, containers: true }, path);
  }
});

test('manual and reusable candidate events always validate all jobs', () => {
  for (const name of ['workflow_dispatch', 'workflow_call']) {
    assert.deepEqual(scopeForEvent(name, {}, () => { throw new Error('must not diff'); }), {
      check: true, containers: true,
    });
  }
});

test('PR uses the complete three-dot diff; push uses all commits in two-dot diff', () => {
  for (const [name, event, expectedRange] of [
    ['pull_request', { pull_request: { base: { sha: 'abc' }, head: { sha: 'def' } } }, 'abc...def'],
    ['push', { before: 'abc', after: 'def' }, 'abc..def'],
  ]) {
    assert.deepEqual(scopeForEvent(name, event, range => {
      assert.equal(range, expectedRange);
      return ['README.md', 'apps/server/src/index.ts'];
    }), { check: true, containers: true });
  }
});

test('missing history and new branches fall back to full validation', () => {
  assert.deepEqual(scopeForEvent('push', { before: '000000', after: 'abc' }, () => []), {
    check: true, containers: true,
  });
  assert.deepEqual(scopeForEvent('pull_request', {}, () => []), { check: true, containers: true });
  assert.deepEqual(scopeForEvent('push', { before: 'abc', after: 'def' }, () => {
    throw new Error('history unavailable');
  }), { check: true, containers: true });
});
