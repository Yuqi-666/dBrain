import assert from 'node:assert/strict';
import test from 'node:test';
import {
  actionsAppId,
  describe,
  main,
  parseArgs,
  planRuleset,
  repoSettings,
  requiredCheck,
  rulesetName,
  rulesetPayload,
} from './apply-ruleset.mjs';

test('the ruleset makes the gate the only way into main', () => {
  const payload = rulesetPayload();
  assert.equal(payload.name, rulesetName);
  assert.equal(payload.target, 'branch');
  assert.equal(payload.enforcement, 'active');
  assert.deepEqual(payload.conditions.ref_name.include, ['refs/heads/main']);
  const types = payload.rules.map(rule => rule.type);
  assert.deepEqual(types, ['pull_request', 'required_status_checks', 'non_fast_forward', 'deletion']);
  assert.ok(!types.includes('required_linear_history'), 'the gate merges with a merge commit');
  const status = payload.rules.find(rule => rule.type === 'required_status_checks').parameters;
  assert.equal(status.strict_required_status_checks_policy, true);
  assert.deepEqual(status.required_status_checks, [
    { context: requiredCheck, integration_id: actionsAppId },
  ]);
  const pullRequest = payload.rules.find(rule => rule.type === 'pull_request').parameters;
  assert.equal(pullRequest.required_approving_review_count, 0, 'the gate is the approval');
});

test('the repository settings allow only a merge commit', () => {
  assert.deepEqual(repoSettings(), {
    allow_auto_merge: true,
    allow_merge_commit: true,
    allow_squash_merge: false,
    allow_rebase_merge: false,
    delete_branch_on_merge: true,
  });
});

test('the plan creates a missing ruleset and replaces a known one', () => {
  const payload = rulesetPayload();
  assert.deepEqual(planRuleset([], payload), { action: 'create', id: null });
  assert.deepEqual(planRuleset([{ id: 7, name: 'another rule' }], payload), {
    action: 'create',
    id: null,
  });
  assert.deepEqual(planRuleset([{ id: 7, name: rulesetName }], payload), {
    action: 'update',
    id: 7,
  });
});

test('the description names every rule and the check context', () => {
  const text = describe(rulesetPayload(), repoSettings(), { action: 'create', id: null });
  assert.ok(text.includes('refs/heads/main'));
  assert.ok(text.includes(`${requiredCheck} (app ${actionsAppId})`));
  assert.ok(text.includes('non_fast_forward'));
  assert.ok(text.includes('allow_auto_merge=true'));
  assert.ok(text.includes('creates it'));
});

test('the argument parser follows the usage text', () => {
  assert.deepEqual(parseArgs([]), {
    apply: false,
    repository: null,
    branch: 'main',
    check: requiredCheck,
    help: false,
  });
  const options = parseArgs(['--apply', '--repo=o/r', '--branch=develop', '--check=verify']);
  assert.equal(options.apply, true);
  assert.equal(options.repository, 'o/r');
  assert.equal(options.branch, 'develop');
  assert.throws(() => parseArgs(['--nope']), /Unknown option/);
});

test('a dry run prints the plan and changes nothing', async () => {
  const output = [];
  const calls = [];
  const code = await main([], {
    io: { log: message => output.push(message) },
    run: (command, args) => {
      calls.push([command, ...args].join(' '));
      if (args.some(arg => arg.includes('rulesets'))) return { status: 0, stdout: '[]' };
      if (args[0] === 'repo') return { status: 0, stdout: 'o/r\n' };
      return { status: 0, stdout: '' };
    },
  });
  assert.equal(code, 0);
  assert.ok(output.join('\n').includes('Dry run'));
  assert.ok(!calls.some(call => call.includes('PATCH')), 'a dry run writes nothing');
  assert.ok(!calls.some(call => call.includes('POST')));
});

test('an apply writes the settings and creates the ruleset', async () => {
  const output = [];
  const calls = [];
  const code = await main(['--apply', '--repo=o/r'], {
    io: { log: message => output.push(message) },
    run: (command, args) => {
      calls.push([command, ...args].join(' '));
      if (args.some(arg => arg.includes('rulesets'))) return { status: 0, stdout: '[]' };
      return { status: 0, stdout: '' };
    },
  });
  assert.equal(code, 0);
  assert.ok(calls.some(call => call.includes('PATCH repos/o/r')));
  assert.ok(calls.some(call => call.includes('POST repos/o/r/rulesets')));
  assert.ok(output.join('\n').includes('created'));
});

test('the plan prints without a GitHub login', async () => {
  const output = [];
  const code = await main(['--repo=o/r'], {
    io: { log: message => output.push(message) },
    run: () => ({ status: null, stdout: null, stderr: null, error: new Error('spawnSync gh ENOENT') }),
  });
  assert.equal(code, 0);
  const text = output.join('\n');
  assert.ok(text.includes('unavailable'));
  assert.ok(text.includes('refs/heads/main'));
  assert.ok(text.includes('Dry run'));
});

test('a failed GitHub call reports and stops', async () => {
  const output = [];
  const code = await main(['--apply', '--repo=o/r'], {
    io: { log: message => output.push(message) },
    run: (command, args) => {
      if (args.some(arg => arg.includes('rulesets'))) return { status: 0, stdout: '[]' };
      return { status: 1, stdout: '', stderr: 'Resource not accessible by integration' };
    },
  });
  assert.equal(code, 1);
  assert.ok(output.join('\n').includes('Resource not accessible'));
});
