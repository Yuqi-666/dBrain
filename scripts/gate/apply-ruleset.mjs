// Applies the GitHub side policy of the push gate.
//
// The repository must make the gate the only way into the main branch:
//
//   1. Auto-merge is on, so the local gate can hand the merge to GitHub.
//   2. Only a merge commit can join the main branch. The job `merged` reads
//      the second parent of that commit.
//   3. A pull request is required, so a direct push to the main branch fails.
//   4. The status check `verify` is required, and the branch must be current.
//   5. The label `gate-change` exists, so a person can approve a change to the
//      gate itself. A label must exist before a pull request can carry it.
//
// The default is a dry run. Pass --apply to change the repository.

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateChangeLabel } from './checks.mjs';

export const rulesetName = 'dBrain main gate';
export const requiredCheck = 'verify';
// The GitHub Actions application. A required check from another application
// cannot satisfy the rule.
export const actionsAppId = 15368;

export const usage = `Usage: node scripts/gate/apply-ruleset.mjs [options]

Print the GitHub policy of the push gate. Pass --apply to write it.

Options:
  --apply              Write the repository settings and the ruleset.
  --repo OWNER/NAME    The repository. The default is the current gh repository.
  --branch NAME        The protected branch. The default is main.
  --check NAME         The required status check. The default is ${requiredCheck}.
  -h, --help           Print this text.
`;

export function parseArgs(argv) {
  const options = { apply: false, repository: null, branch: 'main', check: requiredCheck, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--repo') options.repository = argv[(index += 1)];
    else if (arg.startsWith('--repo=')) options.repository = arg.slice('--repo='.length);
    else if (arg === '--branch') options.branch = argv[(index += 1)];
    else if (arg.startsWith('--branch=')) options.branch = arg.slice('--branch='.length);
    else if (arg === '--check') options.check = argv[(index += 1)];
    else if (arg.startsWith('--check=')) options.check = arg.slice('--check='.length);
    else if (arg === '-h' || arg === '--help') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

// The repository settings that make a merge commit the only merge method and
// let the local gate ask for the merge.
export function repoSettings() {
  return {
    allow_auto_merge: true,
    allow_merge_commit: true,
    allow_squash_merge: false,
    allow_rebase_merge: false,
    delete_branch_on_merge: true,
  };
}

// The label that records the human approval of a change to the gate itself.
// The verifier reads it, and the repository must hold the label before a pull
// request can carry it.
export function labelPayload() {
  return {
    name: gateChangeLabel,
    color: 'fbca04',
    description: 'A change to the push gate. The verifier asks for a review.',
  };
}

export function rulesetPayload({ branch = 'main', check = requiredCheck } = {}) {
  return {
    name: rulesetName,
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include: [`refs/heads/${branch}`], exclude: [] } },
    rules: [
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: false,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          do_not_enforce_on_create: false,
          required_status_checks: [{ context: check, integration_id: actionsAppId }],
        },
      },
      // A force push and a branch deletion must not remove a gated commit.
      { type: 'non_fast_forward' },
      { type: 'deletion' },
    ],
  };
}

export function planRuleset(existing, payload) {
  const found = (existing ?? []).find(entry => entry.name === payload.name);
  return found ? { action: 'update', id: found.id } : { action: 'create', id: null };
}

export function describe(payload, settings, plan) {
  const lines = [];
  lines.push(`Ruleset: ${payload.name}`);
  lines.push(`  Condition: ${payload.conditions.ref_name.include.join(', ')}`);
  lines.push('  Rules:');
  for (const rule of payload.rules) {
    if (rule.type === 'required_status_checks') {
      const contexts = rule.parameters.required_status_checks
        .map(item => `${item.context} (app ${item.integration_id})`)
        .join(', ');
      lines.push(`    - required status checks: ${contexts}`);
      lines.push(
        `    - the branch must be current: ${rule.parameters.strict_required_status_checks_policy}`,
      );
    } else {
      lines.push(`    - ${rule.type}`);
    }
  }
  lines.push('Repository settings:');
  for (const [key, value] of Object.entries(settings)) lines.push(`    - ${key}=${value}`);
  const label = labelPayload();
  lines.push('Label:');
  lines.push(`    - ${label.name}: ${label.description}`);
  lines.push(
    plan.action === 'create'
      ? 'The ruleset does not exist. The script creates it.'
      : `The ruleset exists as ${plan.id}. The script replaces it.`,
  );
  return lines.join('\n');
}

function defaultRun(command, args, options = {}) {
  return spawnSync(command, args, {
    input: options.input,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function describeFailure(result) {
  if (result.error) return `Cannot run gh: ${result.error.message}`;
  return (result.stderr || result.stdout || 'the gh command failed').trim();
}

function apiJson(run, args) {
  const result = run('gh', args);
  if (result.status !== 0) {
    throw new Error(describeFailure(result));
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

export async function main(argv, deps = {}) {
  const io = deps.io ?? { log: message => process.stdout.write(`${message}\n`) };
  const run = deps.run ?? defaultRun;
  const options = parseArgs(argv);
  if (options.help) {
    io.log(usage);
    return 0;
  }

  let repository = options.repository;
  if (!repository) {
    const fromGh = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']);
    repository = process.env.GITHUB_REPOSITORY ?? String(fromGh.stdout ?? '').trim();
  }
  if (!repository) {
    io.log('No repository is set. Pass --repo OWNER/NAME.');
    return 1;
  }

  const payload = rulesetPayload({ branch: options.branch, check: options.check });
  const settings = repoSettings();
  let existing = [];
  try {
    existing = apiJson(run, ['api', `repos/${repository}/rulesets`]) ?? [];
  } catch (error) {
    // The plan is still useful without a login. An apply then fails below.
    io.log(`Note: the ruleset list is unavailable (${error.message}). The plan assumes none.`);
  }
  const plan = planRuleset(existing, payload);
  io.log(describe(payload, settings, plan));

  if (!options.apply) {
    io.log('\nDry run. Pass --apply to write the policy.');
    return 0;
  }

  const patch = Object.entries(settings).flatMap(([key, value]) => ['-F', `${key}=${value}`]);
  const patched = run('gh', ['api', '-X', 'PATCH', `repos/${repository}`, ...patch]);
  if (patched.status !== 0) {
    io.log(`The repository settings failed: ${describeFailure(patched)}`);
    return 1;
  }
  io.log('Repository settings applied.');

  const ruleset =
    plan.action === 'create'
      ? run('gh', [
          'api',
          '-X',
          'POST',
          `repos/${repository}/rulesets`,
          '--input',
          '-',
        ], { input: JSON.stringify(payload) })
      : run('gh', [
          'api',
          '-X',
          'PUT',
          `repos/${repository}/rulesets/${plan.id}`,
          '--input',
          '-',
        ], { input: JSON.stringify(payload) });
  if (ruleset.status !== 0) {
    io.log(`The ruleset failed: ${describeFailure(ruleset)}`);
    return 1;
  }
  io.log(`The ruleset is ${plan.action === 'create' ? 'created' : 'updated'}.`);

  const label = labelPayload();
  const labelled = run('gh', [
    'label',
    'create',
    label.name,
    '--repo',
    repository,
    '--color',
    label.color,
    '--description',
    label.description,
    '--force',
  ]);
  if (labelled.status !== 0) {
    io.log(`The label failed: ${describeFailure(labelled)}`);
    return 1;
  }
  io.log(`The label ${label.name} is ready.`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
