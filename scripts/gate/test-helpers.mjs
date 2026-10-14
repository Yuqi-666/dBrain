// Test support for scripts/gate. This file is not a test file.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { buildTrailers } from './attest.mjs';

export function git(cwd, args, input) {
  return execFileSync('git', args, { cwd, input, encoding: 'utf8' }).trim();
}

export function createRepo(t) {
  const root = mkdtempSync(join(tmpdir(), 'dbrain-gate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, ['init', '--quiet', '--initial-branch=main']);
  git(root, ['config', 'user.email', 'gate@dbrain.invalid']);
  git(root, ['config', 'user.name', 'Gate Test']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  return root;
}

export function write(root, path, content) {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

export function commitAll(root, message) {
  git(root, ['add', '-A']);
  git(root, ['commit', '--quiet', '--no-verify', '--allow-empty', '-m', message]);
  return git(root, ['rev-parse', 'HEAD']);
}

export function gatedCommit(root, options) {
  const checks = options.checks ?? [];
  for (const [path, content] of Object.entries(options.files ?? {})) {
    write(root, path, content);
  }
  git(root, ['add', '-A']);
  const tree = options.tree ?? git(root, ['write-tree']);
  const trailer = buildTrailers({
    version: options.version ?? 1,
    tree,
    checks,
    env: 'node=24.15.0 pnpm=9.0.0 os=linux arch=x64',
    report: `sha256:${'0'.repeat(64)}`,
    runAt: '2026-01-01T00:00:00.000Z',
  });
  git(root, [
    'commit',
    '--quiet',
    '--no-verify',
    '--allow-empty',
    '-m',
    options.subject ?? 'feat(test): a gated change',
    '-m',
    trailer,
  ]);
  return { sha: git(root, ['rev-parse', 'HEAD']), tree };
}
