// The local push gate.
//
// One command checks the workspace, commits it, and pushes it. The commit
// message carries the trailer that the CI verifier reads. This file is the
// only entry that a developer calls.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { resolve } from 'node:path';
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

const definition = { protocol, checks, protectedPaths, trackedDeny };
const protectedBranches = new Set(['main', 'develop']);
const defaultBase = 'main';

export const usage = `Usage: pnpm gate [options]

Run the push gate on the workspace: check, commit, and push one change.

Options:
  -m, --message <text>   The commit subject. Repeat the option for a body paragraph.
      --base <branch>    The pull request base branch. Default: ${defaultBase}.
      --full             Run every local check, not only the checks in scope.
      --release          Run every local check. Use it before a release tag.
      --no-push          Check and commit, but do not push.
      --no-sign          Do not sign the commit. The verifier rejects an unsigned commit.
      --no-auto-merge    Do not ask GitHub to merge the pull request.
      --allow-protected  Allow a local run on ${[...protectedBranches].join(' or ')}.
      --no-hooks         Do not install the local pre-push hook.
      --dry-run          Print the plan and the trailer. Change nothing.
  -h, --help             Print this text.
`;

export function parseArgs(argv) {
  const options = {
    messages: [],
    base: defaultBase,
    full: false,
    push: true,
    sign: true,
    autoMerge: true,
    allowProtected: false,
    hooks: true,
    dryRun: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '-m' || arg === '--message') {
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
    } else if (arg === '--full' || arg === '--release') {
      options.full = true;
    } else if (arg === '--no-push') options.push = false;
    else if (arg === '--no-sign') options.sign = false;
    else if (arg === '--auto-merge') options.autoMerge = true;
    else if (arg === '--no-auto-merge') options.autoMerge = false;
    else if (arg === '--allow-protected') options.allowProtected = true;
    else if (arg === '--no-hooks') options.hooks = false;
    else if (arg === '--dry-run') {
      options.dryRun = true;
      options.push = false;
    } else if (arg === '-h' || arg === '--help') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
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

export function preflight({ root, git, options, io, env }) {
  const problems = [];
  const notes = [];
  const branch = tryGit(git, ['rev-parse', '--abbrev-ref', 'HEAD']);

  if (options.push && protectedBranches.has(branch) && !options.allowProtected) {
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

  if (options.sign && options.push) {
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
  for (const note of notes) io.log(`Note: ${note}`);
  return problems;
}

export function changedPaths({ git, base }) {
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
  const options = deps.options ?? parseArgs(argv);
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

  const pnpmVersion = run('pnpm', ['--version'], { cwd: root });
  const checkEnv = { ...env, GATE_PNPM_VERSION: pnpmVersion.status === 0 ? pnpmVersion.stdout.trim() : '' };

  const problems = preflight({ root, git, options, io, env: checkEnv });
  if (problems.length === 0 && options.push && options.hooks) {
    problems.push(...installLocalHook({ root, git, io }));
  }
  if (problems.length > 0) {
    io.step('The push gate stopped before the checks');
    for (const problem of problems) io.log(`- ${problem}`);
    return 1;
  }

  git(['add', '-A']);
  const tree = git(['write-tree']);
  const paths = changedPaths({ git, base: options.base });
  const selected = options.full
    ? allLocalCheckIds(definition)
    : requiredCheckIds(paths, definition);
  const planned = definition.checks.filter(check => selected.includes(check.id));
  const skipped = definition.checks.filter(
    check => check.runner === 'local' && !selected.includes(check.id),
  );

  io.step(`Check plan for ${paths.length} changed path(s)`);
  io.log(`Checks: ${selected.join(', ') || '(none)'}`);
  if (skipped.length > 0) {
    io.log(`Out of scope: ${skipped.map(check => check.id).join(', ')}`);
  }

  const startedAt = now().toISOString();
  const results = [];
  for (const check of planned) {
    io.step(`${check.id}: ${check.command}`);
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
    base: options.base,
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

  io.step('Gate trailer');
  io.log(trailer);

  if (options.dryRun) {
    io.log('\nDry run: nothing was committed.');
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
  io.log(`Commit ${headSha} holds tree ${tree}.`);

  if (!options.push) {
    io.step('Push skipped');
    io.log('Run `pnpm gate` again without --no-push to push.');
    return 0;
  }

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const pushed = run('git', ['push', '--set-upstream', 'origin', branch], { cwd: root });
  if (pushed.status !== 0) {
    io.step('The push failed');
    io.log(describeFailure(pushed));
    io.log('Do not force a push. Pull the branch, then run the gate again.');
    return 1;
  }
  io.log(`Pushed ${branch} to origin.`);

  const autoMerge = options.autoMerge
    ? autoMergeDecision({
        run,
        paths,
        repository: repositorySlug({ run, root }),
        branch: options.base,
      })
    : { arm: false, reason: null };
  if (autoMerge.reason) io.log(`Auto-merge skipped. ${autoMerge.reason}`);

  const pullRequest = openPullRequest({
    run,
    io,
    root,
    options,
    branch,
    subject,
    body,
    trailer,
    autoMerge,
  });
  if (pullRequest.url) io.log(`Pull request ${pullRequest.url}`);
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

function openPullRequest({ run, io, root, options, branch, subject, body, trailer, autoMerge }) {
  if (!subject) {
    io.log('No commit subject is set. Skipped the pull request.');
    return {};
  }
  const looked = run('gh', ['pr', 'view', '--json', 'number,url,state'], { cwd: root });
  // `gh pr view` resolves the current branch. It also answers for a branch whose
  // pull request is already merged or closed. The gate edits an open pull
  // request only. A closed one leaves the branch free for a new pull request.
  let open = null;
  if (looked.status === 0) {
    try {
      const info = JSON.parse(looked.stdout);
      if (info.state === 'OPEN') open = info;
      else io.log(`Pull request ${info.number} is ${info.state}. The gate opens a new one.`);
    } catch {
      open = null;
    }
  }
  const pullRequestBody = [
    body,
    '',
    '## Push gate',
    '',
    `- Tree: \`${trailer.match(/^Gate-Tree: (.*)$/m)?.[1] ?? ''}\``,
    `- Checks: \`${trailer.match(/^Gate-Checks: (.*)$/m)?.[1] ?? ''}\``,
    `- Report: \`${trailer.match(/^Gate-Report: (.*)$/m)?.[1] ?? ''}\``,
    '',
    '<details><summary>Trailer</summary>',
    '',
    '```',
    trailer,
    '```',
    '',
    '</details>',
  ]
    .filter(part => part !== '')
    .join('\n');

  if (open) {
    const edited = run(
      'gh',
      ['pr', 'edit', String(open.number), '--title', subject, '--body-file', '-'],
      { cwd: root, input: pullRequestBody },
    );
    if (edited.status !== 0) io.log(describeFailure(edited));
    if (autoMerge?.arm) askForMerge({ run, io, root, number: open.number });
    return { url: open.url };
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
  if (autoMerge?.arm) askForMerge({ run, io, root, number: url });
  return { url };
}

function askForMerge({ run, io, root, number }) {
  const merged = run('gh', ['pr', 'merge', String(number), '--auto', '--merge'], { cwd: root });
  if (merged.status !== 0) {
    io.log(describeFailure(merged));
    io.log('GitHub did not accept the auto-merge request. Enable auto-merge in the repository.');
  }
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
