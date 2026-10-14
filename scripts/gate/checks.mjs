// The push gate definition. This file holds data only.
//
// It is the single source of truth for the checks. The local runner
// `scripts/gate/run.mjs` reads it. The CI verifier `scripts/gate/verify.mjs`
// reads the copy at the base commit. A pull request therefore cannot weaken
// the checks that judge it.
//
// `runner: 'local'`  The local gate runs the check, and the trailer must list
//                    the check id.
// `runner: 'main'`   Only a clean GitHub runner can run the check. The build
//                    on `main` is the check. The verifier does not demand it
//                    in the trailer.
//
// `scope` is a list of path globs. A check is required when the change touches
// a matching path. The glob `*` matches every path. Documentation paths are
// filtered out before matching, so a manual-only change stays cheap.

export const protocol = 1;

export const checks = [
  {
    id: 'release-check',
    runner: 'local',
    required: true,
    scope: ['*'],
    command: 'pnpm release:check',
    description: 'The version and the lock files agree.',
  },
  {
    id: 'syntax',
    runner: 'local',
    required: true,
    scope: ['scripts/**', 'apps/*/scripts/**'],
    command:
      'for file in scripts/lib/*.mjs scripts/release/*.mjs scripts/gate/*.mjs scripts/gate.mjs apps/desktop/scripts/*.mjs apps/server/scripts/*.mjs; do node --check "$file"; done && bash -n scripts/gate/hooks/pre-push scripts/release/check-workflows.sh',
    description: 'Every automation script parses.',
  },
  {
    id: 'workflow-lint',
    runner: 'local',
    required: true,
    scope: [
      '.github/workflows/**',
      '.github/actions/**',
      'scripts/release/check-workflows.sh',
    ],
    command: 'bash scripts/release/check-workflows.sh',
    description: 'actionlint accepts every workflow file.',
  },
  {
    id: 'typecheck',
    runner: 'local',
    required: true,
    scope: [
      '**/*.ts',
      '**/*.tsx',
      '**/tsconfig*.json',
      'tsconfig.workspace.json',
      'package.json',
      'pnpm-lock.yaml',
    ],
    command: 'pnpm check-types',
    description: 'The TypeScript type checker accepts the workspace.',
  },
  {
    id: 'lint-gate',
    runner: 'local',
    required: true,
    scope: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.mjs',
      '**/*.cjs',
      '**/*.mts',
      'eslint.config.mjs',
      'scripts/release/lint-baseline.json',
    ],
    command: 'pnpm lint:gate',
    description: 'No new lint diagnostic appears.',
  },
  {
    id: 'unit',
    runner: 'local',
    required: true,
    scope: ['**/*.ts', '**/*.tsx', '**/*.mjs', '**/*.js', '**/*.cjs'],
    command: 'pnpm test:release',
    description: 'The release and library tests pass.',
  },
  {
    id: 'build',
    runner: 'local',
    required: true,
    scope: [
      'apps/**',
      'packages/**',
      'backend/**',
      'pb/**',
      'deploy/**',
      'turbo.json',
      'tsconfig.workspace.json',
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'docker-compose.yml',
    ],
    command: 'pnpm build',
    description: 'The server and the web app build.',
  },
  {
    id: 'smoke-server',
    runner: 'local',
    required: true,
    scope: [
      'backend/**',
      'apps/server/**',
      'pb/**',
      'deploy/**',
      'docker-compose.yml',
      'package.json',
      'pnpm-lock.yaml',
    ],
    command: 'pnpm smoke:server',
    description: 'The server answers against an isolated database.',
  },
  {
    id: 'container',
    runner: 'main',
    required: true,
    scope: [
      'apps/server/**',
      'apps/web/**',
      'packages/**',
      'backend/**',
      'pb/**',
      'deploy/**',
      'docker-compose.yml',
      'package.json',
      'pnpm-lock.yaml',
    ],
    command: null,
    description: 'The container stack builds and answers on the main branch.',
  },
  {
    id: 'desktop',
    runner: 'main',
    required: true,
    scope: ['apps/desktop/**', 'rust-toolchain.toml', 'pnpm-lock.yaml'],
    command: null,
    description: 'The desktop installers build on the main branch and a tag.',
  },
];

// A change under these paths changes the gate itself. The verifier rejects
// such a change unless a person approved it, so a pull request cannot relax
// its own judge.
export const protectedPaths = [
  'scripts/gate/**',
  'scripts/gate.mjs',
  '.github/workflows/gate.yml',
];

// The label that records the human approval of a protected-path change. The
// verifier asks for it, the local gate never merges such a change by itself,
// and `pnpm gate:policy --apply` creates it in the repository.
export const gateChangeLabel = 'gate-change';

// Tracked files that must never exist. The verifier and the local gate read
// this list. A `pattern` is a JavaScript regular expression source.
// The committed templates `.env.example` and `deploy/.env.example` are legal.
export const trackedDeny = [
  { pattern: '(^|/)\\.env$', reason: 'A local environment file holds credentials.' },
  { pattern: '(^|/)\\.env\\.local$', reason: 'A local environment file holds credentials.' },
  {
    pattern: '(^|/)\\.env\\.[A-Za-z0-9_-]+\\.local$',
    reason: 'A local environment file holds credentials.',
  },
  { pattern: '(^|/)\\.pb-admin-password$', reason: 'A password file is not source.' },
  { pattern: '(^|/)node_modules/', reason: 'Dependencies are not source.' },
  { pattern: '(^|/)pb_data/', reason: 'A local database is not source.' },
  { pattern: '(^|/)\\.next/', reason: 'Build output is not source.' },
  { pattern: '(^|/)dist/', reason: 'Build output is not source.' },
  { pattern: '(^|/)target/', reason: 'Build output is not source.' },
  { pattern: '\\.pem$', reason: 'A key file is not source.' },
];
