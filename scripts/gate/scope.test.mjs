import assert from 'node:assert/strict';
import test from 'node:test';
import { checks, protocol, protectedPaths, trackedDeny } from './checks.mjs';
import {
  codePaths,
  findDeniedTracked,
  findProtected,
  globToRegExp,
  isDocumentation,
  matchesAny,
  requiredCheckIds,
} from './scope.mjs';

const definition = { checks, protocol, protectedPaths, trackedDeny };

test('the glob matcher follows the documented rules', () => {
  assert.ok(globToRegExp('**/*.ts').test('a.ts'), '**/ matches zero directories');
  assert.ok(globToRegExp('**/*.ts').test('x/y/a.ts'));
  assert.ok(!globToRegExp('**/*.ts').test('a.tsx'));
  assert.ok(globToRegExp('apps/**').test('apps/web/a.ts'));
  assert.ok(!globToRegExp('apps/**').test('apps'), 'a trailing ** needs one path segment');
  assert.ok(!globToRegExp('a/*.ts').test('a/b/c.ts'), 'a single * stops at the separator');
  assert.ok(globToRegExp('a?.ts').test('ab.ts'));
  assert.ok(!globToRegExp('a?.ts').test('a/b.ts'));
  assert.ok(globToRegExp('docker-compose.yml').test('docker-compose.yml'));
  assert.ok(!globToRegExp('docker-compose.yml').test('dockerXcompose.yml'), 'a dot is literal');
  assert.ok(matchesAny('docs/a.md', ['*']), 'the glob * matches every path');
  assert.ok(matchesAny('a/b/c', ['*']));
});

test('the documentation list matches the release scope script', () => {
  for (const path of ['README.md', 'docs/a.md', '.agents/a.md', '.github/ISSUE_TEMPLATE/bug.yml', 'LICENSE', '.github/dependabot.yml']) {
    assert.ok(isDocumentation(path), path);
  }
  for (const path of ['src/a.ts', '.github/workflows/container-build.yml', 'scripts/gate/run.mjs']) {
    assert.ok(!isDocumentation(path), path);
  }
  assert.ok(isDocumentation('docs/a.ts'), 'the docs/ prefix wins over the file suffix');
  assert.deepEqual(codePaths(['README.md', 'src/a.ts']), ['src/a.ts']);
});

test('a manual-only change needs the cheap check only', () => {
  assert.deepEqual(requiredCheckIds(['README.md', 'docs/ci-cd.md', 'LICENSE'], definition), [
    'release-check',
  ]);
});

test('a change selects the checks in its scope', () => {
  assert.deepEqual(requiredCheckIds(['.github/workflows/container-build.yml'], definition), [
    'release-check',
    'workflow-lint',
  ]);
  assert.deepEqual(requiredCheckIds(['backend/domain/src/node.ts'], definition), [
    'release-check',
    'typecheck',
    'lint-gate',
    'unit',
    'build',
    'smoke-server',
  ]);
  assert.deepEqual(requiredCheckIds(['apps/desktop/src-tauri/src/main.rs'], definition), [
    'release-check',
    'build',
  ]);
  assert.deepEqual(requiredCheckIds(['deploy/nginx.conf'], definition), [
    'release-check',
    'build',
    'smoke-server',
  ]);
  assert.deepEqual(requiredCheckIds(['scripts/gate/checks.mjs'], definition), [
    'release-check',
    'syntax',
    'lint-gate',
    'unit',
  ]);
});

test('the deny list and the protected list are exact', () => {
  const denied = findDeniedTracked(
    ['.env', 'node_modules/a/index.js', 'pb/pb_data/data.db', 'apps/web/.next/BUILD_ID', 'apps/server/dist/index.mjs', 'key.pem', 'docs/a.md'],
    definition,
  );
  assert.deepEqual(
    denied.map(item => item.path),
    ['.env', 'node_modules/a/index.js', 'pb/pb_data/data.db', 'apps/web/.next/BUILD_ID', 'apps/server/dist/index.mjs', 'key.pem'],
  );
  assert.ok(denied.every(item => item.reason.length > 0));
  assert.deepEqual(findProtected(['scripts/gate/checks.mjs', 'scripts/gate.mjs'], definition), [
    'scripts/gate/checks.mjs',
    'scripts/gate.mjs',
  ]);
  assert.deepEqual(
    findProtected(['scripts/release/check.mjs', '.github/workflows/container-build.yml'], definition),
    [],
  );
  assert.deepEqual(findProtected(['.github/workflows/gate.yml'], definition), [
    '.github/workflows/gate.yml',
  ]);
});

test('the deny list keeps the committed templates and rejects every local variant', () => {
  const legal = ['.env.example', 'deploy/.env.example', 'apps/web/.env.example', 'docs/env.example'];
  assert.deepEqual(findDeniedTracked(legal, definition), [], 'a template is source');
  const secrets = [
    '.env',
    'deploy/.env',
    '.env.local',
    'apps/web/.env.local',
    '.env.development.local',
    '.env.test.local',
    'deploy/.env.production.local',
    '.pb-admin-password',
  ];
  assert.deepEqual(
    findDeniedTracked(secrets, definition).map(item => item.path),
    secrets,
  );
});
