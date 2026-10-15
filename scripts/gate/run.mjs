// The local push gate.
//
// One path runs from plan through merge. The commit message carries the
// trailer that the CI verifier reads. A person answers prompts; automation
// sets the last stage and inputs directly.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { buildMessage, buildTrailers, parseTrailers, reportDigest } from './attest.mjs';
import {
  checks,
  gateChangeLabel,
  protocol,
  protectedPaths,
  trackedDeny,
} from './checks.mjs';
import {
  allLocalCheckIds,
  findDeniedTracked,
  findProtected,
  requiredCheckIds,
} from './scope.mjs';
import { installHooks } from './hook.mjs';
import { branchRoute } from './branches.mjs';
import { desktopRunners, containerRunners, declarationOf } from '../release/platforms.mjs';
import { versionIncreases } from './verify.mjs';

const definition = { protocol, checks, protectedPaths, trackedDeny };
const protectedBranches = new Set(['main', 'develop']);
const defaultBase = 'develop';
export const stages = ['plan', 'check', 'commit', 'push', 'pr', 'merge'];
const stageIndex = stage => stages.indexOf(stage);

export const usage = `Usage: pnpm gate [--until STAGE] [options]

With no options, answer prompts. For automation, choose the last stage:
  plan -> check -> commit -> push -> pr -> merge

Options:
      --until <stage>    Stop after plan, check, commit, push, pr, or merge.
  -m, --message <text>   The commit subject. Repeat the option for a body paragraph.
      --base <branch>    Assert the target branch selected from the current branch.
      --desktop-targets <list|none>     Select desktop targets or disable desktop builds.
      --container-platforms <list|none> Select container platforms or disable container builds.
      --version <semver> Set the next version on release/* or hotfix/*.
      --full             Run every local check, not only the checks in scope.
      --no-sign          Do not sign the commit. The verifier rejects an unsigned commit.
      --allow-protected  Allow a local run on ${[...protectedBranches].join(' or ')}.
      --no-hooks         Do not install the local pre-push hook.
  -h, --help             Print this text.
`;

export function parseArgs(argv) {
  let namedStage = false;
  const options = {
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
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--until') {
      options.until = argv[index + 1];
      namedStage = true;
      index += 1;
    } else if (arg.startsWith('--until=')) {
      options.until = arg.slice('--until='.length);
      namedStage = true;
    } else if (arg === '-m' || arg === '--message') {
      const value = argv[index + 1];
      if (value === undefined) throw new Error('The option --message needs a value.');
      options.messages.push(value);
      index += 1;
    } else if (arg.startsWith('--message=')) {
      options.messages.push(arg.slice('--message='.length));
    } else if (arg === '--base') {
      options.base = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--base=')) {
      options.base = arg.slice('--base='.length);
    } else if (arg === '--desktop-targets' || arg === '--container-platforms') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`The option ${arg} needs a value.`);
      options[arg === '--desktop-targets' ? 'desktopTargets' : 'containerPlatforms'] = value;
      index += 1;
    } else if (arg.startsWith('--desktop-targets=')) {
      options.desktopTargets = arg.slice('--desktop-targets='.length);
    } else if (arg.startsWith('--container-platforms=')) {
      options.containerPlatforms = arg.slice('--container-platforms='.length);
    } else if (arg === '--version') {
      options.version = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--version=')) {
      options.version = arg.slice('--version='.length);
    } else if (arg === '--full') {
      options.full = true;
    } else if (arg === '--no-sign') options.sign = false;
    else if (arg === '--allow-protected') options.allowProtected = true;
    else if (arg === '--no-hooks') options.hooks = false;
    else if (arg === '-h' || arg === '--help') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (argv.length > 0 && !namedStage && !options.help) {
    throw new Error('Automation must choose a stopping stage with --until. Run pnpm gate without options for prompts.');
  }
  if (!stages.includes(options.until)) throw new Error(`Unknown gate stage: ${options.until}. Choose ${stages.join(', ')}.`);
  return options;
}

export async function promptGateOptions({ input = process.stdin, output = process.stdout, ask, branch } = {}) {
  if (!ask && !input.isTTY) throw new Error('Interactive gate needs a terminal. For automation, pass --until and any required --message.');
  const prompt = ask ? null : createInterface({ input, output });
  const question = ask ?? (text => prompt.question(text));
  try {
    const until = (await question('Run through stage (plan/check/commit/push/pr/merge) [plan]: ')).trim() || 'plan';
    if (!stages.includes(until)) throw new Error(`Unknown gate stage: ${until}. Choose ${stages.join(', ')}.`);
    const base = (await question(`Expected pull request base [automatic]: `)).trim() || null;
    const full = /^y(es)?$/i.test((await question('Run all checks? [y/N]: ')).trim());
    const currentBranch = branch ?? tryGit(createGit(process.cwd()), ['rev-parse', '--abbrev-ref', 'HEAD']);
    const messages = [];
    if (stageIndex(until) >= stageIndex('commit')) {
      const subject = (await question(currentBranch === 'develop' ? 'Promotion PR title: ' : 'Commit subject: ')).trim();
      if (!subject) throw new Error('A subject is required from the commit stage onward.');
      messages.push(subject);
      const body = (await question('Commit body [empty]: ')).trim();
      if (body) messages.push(body);
    }
    const releaseBranch = currentBranch.startsWith('release/');
    const hotfixBranch = currentBranch.startsWith('hotfix/');
    const declaration = currentBranch === 'develop' || releaseBranch || hotfixBranch ? readJson(resolve(process.cwd(), 'scripts/release/release.json')) : null;
    const version = releaseBranch || hotfixBranch ? (await question(`New release version (current ${declaration.version}): `)).trim() : null;
    const desktopDefault = declaration?.desktopEnabled === false ? 'none' : declaration?.desktopTargets.join(',');
    const containerDefault = declaration?.containerEnabled === false ? 'none' : declaration?.containerPlatforms.join(',');
    const desktopTargets = declaration && !hotfixBranch
      ? (await question(`Desktop targets [${desktopDefault}]: `)).trim() || desktopDefault : null;
    const containerPlatforms = declaration && !hotfixBranch
      ? (await question(`Container platforms [${containerDefault}]: `)).trim() || containerDefault : null;
    return { ...parseArgs([]), until, base, full, messages, version, desktopTargets, containerPlatforms };
  } finally {
    prompt?.close();
  }
}

export function createGit(cwd) {
  return args =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

const defaultIo = {
  log: message => process.stdout.write(`${message}\n`),
  step: message => process.stdout.write(`\n== ${message}\n`),
};

function tryGit(git, args, fallback = '') {
  try {
    return git(args);
  } catch {
    return fallback;
  }
}

function refExists(git, ref) {
  return tryGit(git, ['for-each-ref', '--format=%(refname)', ref]) === ref;
}

function routeForRun(branch, options, git) {
  const route = branchRoute(branch);
  if (route?.kind === 'development' && options.base === 'main') {
    const deployed = ['refs/remotes/origin/main', 'refs/heads/main']
      .filter(ref => refExists(git, ref))
      .some(ref => tryGit(git, ['ls-tree', '-r', '--name-only', ref, '--', 'scripts/gate/branches.mjs']) === 'scripts/gate/branches.mjs');
    if (!deployed) return { kind: 'bootstrap', bases: ['main'] };
  }
  return route;
}

function lines(value) {
  return value.split('\0').filter(Boolean);
}

export function collectEnvironment(env = process.env) {
  return [
    `node=${process.versions.node}`,
    `pnpm=${env.GATE_PNPM_VERSION ?? 'unknown'}`,
    `os=${platform()}`,
    `arch=${arch()}`,
  ].join(' ');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function selectedNames(value, allowed, label) {
  if (String(value).trim().toLowerCase() === 'none') return [];
  const names = String(value ?? '').split(/[\s,]+/).filter(Boolean);
  if (!names.length || new Set(names).size !== names.length || names.some(name => !allowed.includes(name))) {
    throw new Error(`${label} must be a nonempty list of distinct names from: ${allowed.join(', ')}.`);
  }
  return names;
}

function validVersion(version) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(version ?? '');
}

function releaseSelection(options) {
  if (!validVersion(options.version)) {
    throw new Error('A release/* branch needs --version MAJOR.MINOR.PATCH.');
  }
  const selection = {
    version: options.version,
    desktopTargets: selectedNames(options.desktopTargets, Object.keys(desktopRunners), 'Desktop targets'),
    containerPlatforms: selectedNames(options.containerPlatforms, Object.keys(containerRunners), 'Container platforms'),
  };
  if (!selection.desktopTargets.length && !selection.containerPlatforms.length) throw new Error('Select at least one desktop or container platform.');
  return selection;
}

function releaseAt(git, ref) {
  try {
    return JSON.parse(git(['show', `${ref}:scripts/release/release.json`]));
  } catch {
    return null;
  }
}

function nextVersionProblem({ git, run, root, version, base }) {
  const ref = refExists(git, `refs/remotes/origin/${base}`) ? `origin/${base}` : base;
  const previous = releaseAt(git, ref);
  if (!previous) return `Cannot read the release version on ${ref}. Update the target branch first.`;
  if (!versionIncreases(previous.version, version)) {
    return `Version ${version} must be newer than ${previous.version} on ${ref}.`;
  }
  const tag = `v${version}`;
  const remote = run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], { cwd: root });
  if (remote.status !== 0) return `Cannot check whether ${tag} already exists on origin: ${describeFailure(remote)}`;
  if (remote.stdout.trim()) return `Tag ${tag} already exists on origin. Choose a new version.`;
  return null;
}

export function preflight({ root, git, options, io, env }) {
  const problems = [];
  const notes = [];
  const branch = tryGit(git, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const route = routeForRun(branch, options, git);
  if (!route && stageIndex(options.until) >= stageIndex('push')) problems.push(`The branch ${branch || '(none)'} has no gate route.`);
  if (options.base && route && !route.bases.includes(options.base)) {
    problems.push(`The branch ${branch} targets ${route.bases.join(' and ')}, not ${options.base}.`);
  }

  if (stageIndex(options.until) >= stageIndex('push') && protectedBranches.has(branch) && route?.kind !== 'promotion' && !options.allowProtected) {
    problems.push(
      `The branch ${branch} is protected. Work on a branch, or pass --allow-protected.`,
    );
  }

  const nodeVersionFile = resolve(root, '.node-version');
  if (existsSync(nodeVersionFile)) {
    const wanted = readFileSync(nodeVersionFile, 'utf8').trim();
    const current = process.versions.node;
    const wantedParts = wanted.split('.');
    const currentParts = current.split('.');
    if (wantedParts[0] !== currentParts[0] || wantedParts[1] !== currentParts[1]) {
      problems.push(`Node ${wanted} is required; this shell runs Node ${current}.`);
    } else if (wanted !== current) {
      notes.push(`Node ${current} runs instead of the pinned ${wanted}.`);
    }
  }

  const packageFile = resolve(root, 'package.json');
  if (existsSync(packageFile)) {
    const wanted = (readJson(packageFile).packageManager ?? '').replace(/^pnpm@/, '');
    const current = env.GATE_PNPM_VERSION;
    if (!current) {
      problems.push('The gate cannot read the pnpm version.');
    } else if (wanted && wanted !== current) {
      problems.push(`pnpm ${wanted} is required; this shell runs pnpm ${current}.`);
    }
  }

  if (options.sign && stageIndex(options.until) >= stageIndex('commit') && route?.kind !== 'promotion') {
    const format = tryGit(git, ['config', '--get', 'gpg.format']);
    const key = tryGit(git, ['config', '--get', 'user.signingkey']);
    if (format !== 'ssh' || !key) {
      problems.push(
        'The commit signature is not configured. Run these commands once, then repeat the gate:\n' +
          '  git config --global gpg.format ssh\n' +
          '  git config --global user.signingkey ~/.ssh/id_ed25519.pub\n' +
          '  git config --global commit.gpgsign true\n' +
          'Add the same key to GitHub as a signing key.',
      );
    }
  }

  const denied = findDeniedTracked(lines(tryGit(git, ['ls-files', '-z'])), definition);
  if (denied.length > 0) {
    problems.push(
      `Tracked files violate the repository rules: ${denied
        .map(item => `${item.path} (${item.reason})`)
        .join('; ')}.`,
    );
  }

  io.log(`Branch ${branch || '(none)'}`);
  if (route) io.log(`Route ${branch} → ${route.bases.join(' and ')}${route.kind === 'bootstrap' ? ' (bootstrap)' : ''}`);
  for (const note of notes) io.log(`Note: ${note}`);
  return problems;
}

export function changedPaths({ git, base, includeWorktree = false }) {
  const set = new Set();
  for (const path of lines(tryGit(git, ['diff', '--name-only', '--no-renames', '-z', '--cached']))) {
    set.add(path);
  }
  const mergeBase = base ? tryGit(git, ['merge-base', base, 'HEAD']) : '';
  if (mergeBase) {
    for (const path of lines(
      tryGit(git, ['diff', '--name-only', '--no-renames', '-z', `${mergeBase}...HEAD`]),
    )) {
      set.add(path);
    }
  }
  if (includeWorktree) {
    for (const path of lines(tryGit(git, ['diff', '--name-only', '--no-renames', '-z', 'HEAD']))) {
      set.add(path);
    }
    for (const path of lines(tryGit(git, ['ls-files', '--others', '--exclude-standard', '-z']))) {
      set.add(path);
    }
  }
  return [...set].sort();
}

// The local brake is a hook. The gate installs the hook again on every push,
// because a missing hook is a gate that fails without a message.
function installLocalHook({ root, git, io }) {
  const result = installHooks({ root, git });
  if (!result.ok) {
    return [
      `${result.reason} Run \`pnpm gate:hooks\`, or pass --no-hooks to push without the local brake.`,
    ];
  }
  if (result.installed) io.log(`Local push gate installed at ${result.path}.`);
  return [];
}

export async function runGate(argv, deps = {}) {
  const io = deps.io ?? defaultIo;
  const options = deps.options ?? (argv.length === 0 ? await promptGateOptions() : parseArgs(argv));
  if (options.help) {
    io.log(usage);
    return 0;
  }

  const root = resolve(deps.cwd ?? process.cwd());
  const git = deps.git ?? createGit(root);
  const runCheck = deps.runCheck ?? defaultRunCheck;
  const run = deps.run ?? defaultRun;
  const now = deps.now ?? (() => new Date());
  const env = deps.env ?? process.env;
  const until = options.until ?? 'merge';
  const branch = tryGit(git, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const route = routeForRun(branch, options, git);
  const promotion = route?.kind === 'promotion';
  const releaseBranch = branch.startsWith('release/');
  const hotfix = route?.kind === 'hotfix';
  if (stageIndex(until) >= stageIndex('commit') && !options.messages[0]?.trim()) {
    io.log('A commit or promotion subject is required from the commit stage onward. Pass -m "type(scope): subject".');
    return 1;
  }

  const pnpmVersion = run('pnpm', ['--version'], { cwd: root });
  const checkEnv = { ...env, GATE_PNPM_VERSION: pnpmVersion.status === 0 ? pnpmVersion.stdout.trim() : '' };

  const problems = preflight({ root, git, options, io, env: checkEnv });
  if (problems.length === 0 && stageIndex(until) >= stageIndex('push') && options.hooks) {
    problems.push(...installLocalHook({ root, git, io }));
  }
  if (problems.length > 0) {
    io.step('The push gate stopped before the checks');
    for (const problem of problems) io.log(`- ${problem}`);
    return 1;
  }

  if (releaseBranch) {
    let selection;
    try {
      selection = releaseSelection(options);
    } catch (error) {
      io.log(error.message);
      return 1;
    }
    const problem = nextVersionProblem({ git, run, root, version: selection.version, base: 'develop' });
    if (problem) {
      io.log(problem);
      return 1;
    }
    io.log(`Release v${selection.version}: desktop=${selection.desktopTargets.join(',') || 'none'}; containers=${selection.containerPlatforms.join(',') || 'none'}.`);
    if (until !== 'plan') {
      const synchronized = run('node', ['scripts/release/version.mjs', selection.version], { cwd: root });
      if (synchronized.status !== 0) {
        io.log(describeFailure(synchronized));
        return 1;
      }
      const file = resolve(root, 'scripts/release/release.json');
      const declaration = readJson(file);
      declaration.desktopEnabled = selection.desktopTargets.length > 0;
      declaration.containerEnabled = selection.containerPlatforms.length > 0;
      if (selection.desktopTargets.length) declaration.desktopTargets = selection.desktopTargets;
      if (selection.containerPlatforms.length) declaration.containerPlatforms = selection.containerPlatforms;
      writeFileSync(file, `${JSON.stringify(declaration, null, 2)}\n`);
    }
  } else if (hotfix) {
    if (options.desktopTargets || options.containerPlatforms) {
      io.log('A hotfix keeps the platform declaration from main.');
      return 1;
    }
    if (!validVersion(options.version)) {
      io.log('A hotfix needs --version MAJOR.MINOR.PATCH for the main candidate.');
      return 1;
    }
    const problem = nextVersionProblem({ git, run, root, version: options.version, base: 'main' });
    if (problem) {
      io.log(problem);
      return 1;
    }
    io.log(`Hotfix release v${options.version}.`);
    if (until !== 'plan') {
      const synchronized = run('node', ['scripts/release/version.mjs', options.version], { cwd: root });
      if (synchronized.status !== 0) {
        io.log(describeFailure(synchronized));
        return 1;
      }
    }
  }

  if (promotion) {
    if (stageIndex(until) >= stageIndex('pr') && (!options.desktopTargets || !options.containerPlatforms)) {
      io.log('Promotion needs --desktop-targets and --container-platforms. Select the platforms declared in release.json.');
      return 1;
    }
    const dirty = tryGit(git, ['status', '--porcelain']);
    if (dirty) {
      io.log('Promotion requires a clean develop branch. Merge release and platform changes into develop first.');
      return 1;
    }
    const remote = run('git', ['ls-remote', 'origin', 'refs/heads/develop'], { cwd: root });
    if (remote.status !== 0 || remote.stdout.trim().split(/\s+/)[0] !== git(['rev-parse', 'HEAD'])) {
      io.log('Promotion requires local develop to equal origin/develop. Fetch and update develop first.');
      return 1;
    }
    const main = run('git', ['ls-remote', 'origin', 'refs/heads/main'], { cwd: root });
    const mainSha = main.status === 0 ? main.stdout.trim().split(/\s+/)[0] : '';
    if (!mainSha || run('git', ['merge-base', '--is-ancestor', mainSha, 'HEAD'], { cwd: root }).status !== 0) {
      io.log('Promotion requires the remote main tip to be an ancestor of develop. Merge main into develop first.');
      return 1;
    }
    const release = readJson(resolve(root, 'scripts/release/release.json'));
    const problem = nextVersionProblem({ git, run, root, version: release.version, base: 'main' });
    if (problem) {
      io.log(problem);
      return 1;
    }
    const effective = declarationOf(release);
    for (const [key, value] of [['desktopTargets', options.desktopTargets], ['containerPlatforms', options.containerPlatforms]]) {
      const names = value?.trim().toLowerCase() === 'none' ? [] : value ? value.split(/[\s,]+/).filter(Boolean) : [];
      if (value && (names.length !== effective[key].length || new Set(names).size !== names.length || names.some(name => !effective[key].includes(name)))) {
        io.log(`${key} must match the declared list: ${effective[key].join(',') || 'none'}. Change release.json through a development PR first.`);
        return 1;
      }
    }
    io.log(`Promotion v${release.version}: desktop=${effective.desktopTargets.join(',') || 'none'}; containers=${effective.containerPlatforms.join(',') || 'none'}.`);
  } else if (!releaseBranch && !hotfix && (options.version || options.desktopTargets || options.containerPlatforms)) {
    io.log('Version and platform selection apply only to release/* preparation or develop promotion.');
    return 1;
  }

  if (until !== 'plan' && !promotion) git(['add', '-A']);
  const targetBase = route?.bases[0];
  const comparisonBase = targetBase && refExists(git, `refs/remotes/origin/${targetBase}`)
    ? `origin/${targetBase}`
    : targetBase === 'develop' && !refExists(git, 'refs/heads/develop')
      ? 'main' : targetBase;
  const paths = changedPaths({ git, base: comparisonBase, includeWorktree: until === 'plan' });
  if ((releaseBranch || hotfix) && until === 'plan') {
    for (const path of ['scripts/release/release.json', 'apps/desktop/package.json', 'apps/desktop/src-tauri/tauri.conf.json', 'apps/desktop/src-tauri/Cargo.toml', 'apps/desktop/src-tauri/Cargo.lock', 'docker-compose.yml', 'deploy/.env.example']) {
      if (!paths.includes(path)) paths.push(path);
    }
    paths.sort();
  }
  const selected = options.full || route?.kind === 'hotfix' || route?.kind === 'bootstrap'
    ? allLocalCheckIds(definition)
    : requiredCheckIds(paths, definition);
  const planned = definition.checks.filter(check => selected.includes(check.id));
  const skipped = definition.checks.filter(
    check => check.runner === 'local' && !selected.includes(check.id),
  );

  io.step(`plan: ${paths.length} changed path(s)`);
  io.log(`Checks: ${selected.join(', ') || '(none)'}`);
  if (skipped.length > 0) {
    io.log(`Out of scope: ${skipped.map(check => check.id).join(', ')}`);
  }

  if (until === 'plan') {
    io.log('Stopped at plan. No files staged; no checks run.');
    return 0;
  }

  const tree = git(['write-tree']);

  const startedAt = now().toISOString();
  const results = [];
  for (const check of planned) {
    io.step(`check: ${check.id}`);
    const result = await runCheck(check, { cwd: root, env: checkEnv, io });
    results.push({
      id: check.id,
      command: check.command,
      status: result.status,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
    });
    if (result.status !== 'passed') {
      io.step(`The check ${check.id} failed`);
      writeReport(root, {
        protocol,
        tree,
        startedAt,
        finishedAt: now().toISOString(),
        checks: results,
      });
      return 1;
    }
    io.log(`Passed ${check.id} (${result.durationMs} ms).`);
  }

  const afterTree = git(['write-tree']);
  if (afterTree !== tree) {
    io.step('A check staged a change to a tracked file');
    io.log('The gate tests the tree of the index. Run the gate again after you review the change.');
    return 1;
  }
  const unstaged = lines(tryGit(git, ['diff', '--name-only', '--no-renames', '-z']));
  if (unstaged.length > 0) {
    io.log(`Note: a check changed ${unstaged.join(', ')}. The commit keeps the tested content.`);
  }

  const report = {
    protocol,
    tree,
    base: route?.bases[0],
    paths,
    startedAt,
    finishedAt: now().toISOString(),
    env: checkEnv.GATE_PNPM_VERSION ? collectEnvironment(checkEnv) : collectEnvironment(env),
    checks: results,
  };
  const trailer = buildTrailers({
    version: protocol,
    tree,
    checks: selected,
    env: report.env,
    report: reportDigest(report),
    runAt: now().toISOString(),
  });
  writeReport(root, report);

  const subject = options.messages[0] ?? '';
  const body = options.messages.slice(1).join('\n\n');
  const message = buildMessage(subject, body, trailer);

  io.log(`Checks passed; tree ${tree}; report ${reportDigest(report)}.`);
  if (until === 'check') {
    io.log('Stopped at check. No commit created.');
    return 0;
  }

  if (promotion) {
    io.step('commit: existing develop merge history; no new commit');
    if (until === 'commit') return 0;
    io.step('push: develop is already remote; no direct push');
    if (until === 'push') return 0;
    const subject = options.messages[0];
    const body = options.messages.slice(1).join('\n\n');
    const result = openPullRequest({ run, io, root, options: { ...options, base: 'main' }, branch, subject, body, trailer: null });
    if (!result.url) return 1;
    io.step(`pr: develop → main ${result.url}`);
    if (until === 'pr') return 0;
    const decision = autoMergeDecision({ run, paths, repository: repositorySlug({ run, root }), branch: 'main' });
    if (decision.arm && !askForMerge({ run, io, root, number: result.number ?? result.url })) return 1;
    if (!decision.arm) io.log(`Merge request skipped. ${decision.reason}`);
    return 0;
  }

  const headTrailers = parseTrailers(tryGit(git, ['log', '-1', '--format=%B', 'HEAD']));
  const headTree = tryGit(git, ['rev-parse', 'HEAD^{tree}']);
  const reuse =
    headTrailers !== null &&
    headTrailers.tree === tree &&
    sameIds(headTrailers.checks, selected) &&
    (options.sign === false || headTrailers.report.length > 0);

  if (reuse) {
    io.log('The head commit already carries a gate trailer for this tree. The gate keeps it.');
  } else {
    const commitArgs = ['commit', '--allow-empty', '--no-verify'];
    if (options.sign) commitArgs.push('-S');
    for (const part of [subject, body, trailer]) {
      if (part) commitArgs.push('-m', part);
    }
    const committed = run('git', commitArgs, { cwd: root });
    if (committed.status !== 0) {
      io.step('The commit failed');
      io.log(describeFailure(committed));
      return 1;
    }
  }

  const committedTree = git(['rev-parse', 'HEAD^{tree}']);
  if (committedTree !== tree) {
    io.step('The commit tree differs from the tested tree');
    return 1;
  }
  const headSha = git(['rev-parse', 'HEAD']);
  io.step(`commit: ${headSha}`);

  if (until === 'commit') {
    io.log('Stopped at commit.');
    return 0;
  }

  const pushed = run('git', ['push', '--set-upstream', 'origin', branch], { cwd: root });
  if (pushed.status !== 0) {
    io.step('The push failed');
    io.log(describeFailure(pushed));
    io.log('Do not force a push. Pull the branch, then run the gate again.');
    return 1;
  }
  io.step(`push: ${branch} to origin`);
  if (until === 'push') return 0;

  for (const base of route.bases) {
    const pullRequest = openPullRequest({
      run, io, root, options: { ...options, base }, branch, subject, body, trailer,
    });
    if (!pullRequest.url) return 1;
    io.step(`pr: ${branch} → ${base} ${pullRequest.url}`);
    if (until === 'pr') continue;
    const decision = autoMergeDecision({ run, paths, repository: repositorySlug({ run, root }), branch: base });
    if (decision.arm && !askForMerge({ run, io, root, number: pullRequest.number ?? pullRequest.url })) return 1;
    if (!decision.arm) io.log(`Merge request skipped for ${base}. ${decision.reason}`);
  }
  return 0;
}

/** The `OWNER/NAME` of the repository the gate talks to. */
function repositorySlug({ run, root }) {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const viewed = run(
    'gh',
    ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'],
    { cwd: root },
  );
  return viewed.status === 0 ? viewed.stdout.trim() : '';
}

function sameIds(left, right) {
  if (left.length !== right.length) return false;
  const sorted = [...right].sort();
  return [...left].sort().every((id, index) => id === sorted[index]);
}

// A missing binary gives no stderr. Name the failure either way.
function describeFailure(result) {
  if (result.error) return `Cannot run the command: ${result.error.message}`;
  return (result.stderr || result.stdout || '').trim();
}

function writeReport(root, report) {
  const directory = resolve(root, '.gate');
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, 'last-run.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function openPullRequest({ run, io, root, options, branch, subject, body, trailer }) {
  if (!subject) {
    io.log('No commit subject is set. Skipped the pull request.');
    return {};
  }
  const looked = run('gh', ['pr', 'list', '--head', branch, '--base', options.base, '--state', 'open', '--json', 'number,url,state'], { cwd: root });
  // `gh pr view` resolves the current branch. It also answers for a branch whose
  // pull request is already merged or closed. The gate edits an open pull
  // request only. A closed one leaves the branch free for a new pull request.
  let open = null;
  if (looked.status === 0) {
    try {
      const info = JSON.parse(looked.stdout)?.[0];
      if (info?.state === 'OPEN') open = info;
    } catch {
      open = null;
    }
  }
  const pullRequestBody = (trailer ? [
    body, '', '## Push gate', '',
    `- Tree: \`${trailer.match(/^Gate-Tree: (.*)$/m)?.[1] ?? ''}\``,
    `- Checks: \`${trailer.match(/^Gate-Checks: (.*)$/m)?.[1] ?? ''}\``,
    `- Report: \`${trailer.match(/^Gate-Report: (.*)$/m)?.[1] ?? ''}\``,
    '', '<details><summary>Trailer</summary>', '', '```', trailer, '```', '', '</details>',
  ] : [body, '', '## Promotion', '', 'GitHub verifies the merge history of develop. The release platforms are declared in scripts/release/release.json.'])
    .filter(part => part !== '')
    .join('\n');

  if (open) {
    // The command `gh pr edit` reads the project cards of the pull request over
    // GraphQL. That query fails on a repository that uses the retired Projects
    // classic. The REST endpoint keeps the title and the body in step without
    // it.
    const edited = run(
      'gh',
      ['api', '--method', 'PATCH', `repos/{owner}/{repo}/pulls/${open.number}`, '--input', '-'],
      { cwd: root, input: JSON.stringify({ title: subject, body: pullRequestBody }) },
    );
    if (edited.status !== 0) {
      io.log(describeFailure(edited));
      return {};
    }
    return { url: open.url, number: open.number };
  }

  const created = run(
    'gh',
    [
      'pr',
      'create',
      '--base',
      options.base,
      '--head',
      branch,
      '--title',
      subject,
      '--body-file',
      '-',
    ],
    { cwd: root, input: pullRequestBody },
  );
  if (created.status !== 0) {
    io.log(describeFailure(created));
    io.log('The branch is pushed. Open the pull request by hand.');
    return {};
  }
  const url = created.stdout.trim().split('\n').pop();
  return { url };
}

function askForMerge({ run, io, root, number }) {
  const merged = run('gh', ['pr', 'merge', String(number), '--auto', '--merge'], { cwd: root });
  if (merged.status !== 0) {
    io.log(describeFailure(merged));
    io.log('GitHub did not accept the auto-merge request. Enable auto-merge in the repository.');
    return false;
  }
  io.step('merge: auto-merge requested; GitHub waits for required checks.');
  return true;
}

/**
 * Decides whether the gate hands the merge to GitHub.
 *
 * The gate arms auto-merge only when GitHub can hold the merge back. Two cases
 * keep the merge with the operator:
 *
 * - The change edits the gate itself. The verifier asks for the label
 *   `gate-change` and a review, and an automatic merge would land the change
 *   before anyone read it.
 * - The repository does not require the `verify` check. GitHub then merges an
 *   auto-merge request at once, a red check included, so arming it would skip
 *   the gate instead of waiting for it.
 */
export function autoMergeDecision({
  run,
  definition: passed = definition,
  paths,
  repository,
  branch = 'main',
  check = 'verify',
}) {
  const edited = findProtected(paths, passed);
  if (edited.length > 0) {
    return {
      arm: false,
      reason:
        `The change edits the gate itself (${edited.join(', ')}). ` +
        `Add the label ${gateChangeLabel} and get a review, then merge by hand.`,
    };
  }
  if (!requiresCheck(run, { repository, branch, check })) {
    return {
      arm: false,
      reason:
        `The repository does not require the ${check} check, so GitHub would ` +
        'merge an auto-merge request at once. Merge the pull request by hand ' +
        'after the check is green.',
    };
  }
  return { arm: true, reason: null };
}

/**
 * True when the branch requires the named status check, through branch
 * protection or through a ruleset.
 *
 * Every failure to read the settings answers false. A merge that waits for
 * nothing is worse than a merge a person performs.
 */
export function requiresCheck(run, { repository, branch = 'main', check = 'verify' }) {
  if (!repository) return false;
  const protection = run('gh', ['api', `repos/${repository}/branches/${branch}/protection`]);
  if (protection.status === 0) {
    const contexts = parsedJson(protection.stdout)?.required_status_checks?.contexts ?? [];
    if (contexts.includes(check)) return true;
  }
  const listed = run('gh', ['api', `repos/${repository}/rulesets`]);
  if (listed.status !== 0) return false;
  const entries = parsedJson(listed.stdout);
  if (!Array.isArray(entries)) return false;
  for (const entry of entries) {
    if (entry.enforcement && entry.enforcement !== 'active') continue;
    const detail = run('gh', ['api', `repos/${repository}/rulesets/${entry.id}`]);
    if (detail.status !== 0) continue;
    const ruleset = parsedJson(detail.stdout);
    if (!ruleset) continue;
    const refs = ruleset.conditions?.ref_name?.include ?? [];
    if (!refs.some(ref => ref === `refs/heads/${branch}` || ref === '~ALL' || ref === '~DEFAULT_BRANCH')) {
      continue;
    }
    const rule = (ruleset.rules ?? []).find(item => item.type === 'required_status_checks');
    const required = rule?.parameters?.required_status_checks ?? [];
    if (required.some(item => item.context === check)) return true;
  }
  return false;
}

function parsedJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function defaultRunCheck(check, { cwd, env }) {
  const started = Date.now();
  const result = spawnSync(check.command, {
    cwd,
    env,
    shell: true,
    stdio: 'inherit',
  });
  return {
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status,
    durationMs: Date.now() - started,
  };
}

function defaultRun(command, args, { cwd, input } = {}) {
  return spawnSync(command, args, {
    cwd,
    input,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}
