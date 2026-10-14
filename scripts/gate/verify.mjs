// The CI verifier of the push gate.
//
// The workflow copies this file, and its three siblings, from the base commit
// and runs the copy. A pull request cannot weaken the verifier that judges it.
// The module imports only Node.js built-ins and its three siblings.
//
// The verifier answers one question: did the author use the local gate on the
// tree that this pull request merges? It does not run the checks again.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTrailers } from './attest.mjs';
import {
  checks,
  gateChangeLabel,
  protocol,
  protectedPaths,
  trackedDeny,
} from './checks.mjs';
import {
  allLocalCheckIds,
  codePaths,
  findDeniedTracked,
  findProtected,
  requiredCheckIds,
} from './scope.mjs';

const defaultDefinition = { protocol, checks, protectedPaths, trackedDeny };

export function createGit(cwd) {
  return args =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
}

export async function verifyGate(options, deps = {}) {
  const definition = options.definition ?? defaultDefinition;
  const git = deps.git ?? createGit(options.repoDir ?? process.cwd());
  const verifySignature =
    deps.verifySignature ?? (async () => ({ verified: false, reason: 'not checked' }));
  const failures = [];
  const notes = [];
  const details = {};

  const head = options.headSha;
  if (!head) {
    return { ok: false, failures: ['No head commit is set.'], notes, details };
  }

  const message = git(['log', '-1', '--format=%B', head]);
  const trailers = parseTrailers(message);

  if (!trailers) {
    failures.push('The head commit has no Gate trailer. Run the local gate before you push.');
  } else {
    details.version = trailers.version;
    details.tree = trailers.tree;
    details.checks = trailers.checks;
    if (trailers.version !== definition.protocol) {
      failures.push(
        `The trailer protocol is ${trailers.version}; this verifier reads ${definition.protocol}.`,
      );
    }
    const tree = git(['rev-parse', `${head}^{tree}`]);
    if (tree !== trailers.tree) {
      failures.push(
        `The trailer names the tree ${trailers.tree}; the commit holds ${tree}. Run the local gate again.`,
      );
    }
  }

  let paths = null;
  if (options.baseSha && options.baseSha !== head) {
    try {
      paths = git(['diff', '--name-only', '--no-renames', '-z', `${options.baseSha}...${head}`])
        .split('\0')
        .filter(Boolean);
    } catch (error) {
      notes.push(
        `The verifier cannot read the diff from the base commit. It demands every local check. ${error.message}`,
      );
    }
  } else {
    notes.push('No base commit is set. The verifier demands every local check.');
  }

  const required = paths === null ? allLocalCheckIds(definition) : requiredCheckIds(paths, definition);
  details.requiredChecks = required;

  if (trailers) {
    const missing = required.filter(id => !trailers.checks.includes(id));
    if (missing.length > 0) {
      failures.push(`The trailer does not cover the required checks: ${missing.join(', ')}.`);
    }
  }

  const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
  const denied = findDeniedTracked(tracked, definition);
  if (denied.length > 0) {
    const list = denied.map(item => `${item.path} (${item.reason})`).join('; ');
    failures.push(`Tracked files violate the repository rules: ${list}.`);
  }

  const changed = codePaths(paths ?? []);
  const protectedFiles = findProtected(changed, definition);
  details.protectedPaths = protectedFiles;
  if (protectedFiles.length > 0 && options.gateChangeApproved !== true) {
    failures.push(
      `The change edits the gate itself (${protectedFiles.join(', ')}). Add the label \`${gateChangeLabel}\` and get a review.`,
    );
  }

  const signature = await verifySignature({ repository: options.repository, sha: head });
  details.signature = signature;
  if (signature.verified === true) {
    notes.push(`The commit signature is valid (${signature.login ?? 'unknown account'}).`);
  } else if (options.requireSignature === true) {
    failures.push(`The commit signature is not valid: ${signature.reason}.`);
  } else {
    notes.push(`The commit signature is not enforced here: ${signature.reason}.`);
  }

  return { ok: failures.length === 0, failures, notes, details };
}

// A merge on the main branch must come from gated commits. The first parent is
// the previous main tip, which an earlier run of this check accepted. Every
// other parent is a change that arrived through a pull request.
export async function verifyMergeGate(options, deps = {}) {
  const definition = options.definition ?? defaultDefinition;
  const git = deps.git ?? createGit(options.repoDir ?? process.cwd());
  const verifySignature =
    deps.verifySignature ?? (async () => ({ verified: false, reason: 'not checked' }));
  const failures = [];
  const notes = [];
  const details = {};

  const head = options.headSha;
  if (!head) {
    return { ok: false, failures: ['No head commit is set.'], notes, details };
  }

  const parents = git(['rev-list', '--parents', '-n', '1', head]).split(' ').slice(1);
  details.parents = parents;
  if (parents.length < 2) {
    failures.push('The pushed commit is not a merge commit. Push a change through a pull request.');
    return { ok: false, failures, notes, details };
  }

  const gated = [];
  for (const parent of parents.slice(1)) {
    const trailers = parseTrailers(git(['log', '-1', '--format=%B', parent]));
    if (!trailers) {
      failures.push(`The parent ${parent} has no Gate trailer.`);
      continue;
    }
    if (trailers.version !== definition.protocol) {
      failures.push(`The parent ${parent} carries the trailer protocol ${trailers.version}.`);
    }
    const tree = git(['rev-parse', `${parent}^{tree}`]);
    if (tree !== trailers.tree) {
      failures.push(`The parent ${parent} names the tree ${trailers.tree} but holds ${tree}.`);
    }
    const signature = await verifySignature({ repository: options.repository, sha: parent });
    if (signature.verified === true) {
      gated.push(parent);
    } else if (options.requireSignature === true) {
      failures.push(`The parent ${parent} has no valid signature: ${signature.reason}.`);
    } else {
      notes.push(`The parent ${parent} has no enforced signature: ${signature.reason}.`);
    }
  }

  details.gatedParents = gated;
  return { ok: failures.length === 0, failures, notes, details };
}

export function githubSignatureVerifier({ token, fetchImpl = globalThis.fetch }) {  return async ({ repository, sha }) => {
    if (!token) return { verified: false, reason: 'no GitHub token is set' };
    if (!repository) return { verified: false, reason: 'no repository is set' };
    let response;
    try {
      response = await fetchImpl(`https://api.github.com/repos/${repository}/commits/${sha}`, {
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'user-agent': 'dbrain-push-gate',
        },
      });
    } catch (error) {
      return { verified: false, reason: `the GitHub API is unreachable (${error.message})` };
    }
    if (!response.ok) {
      return { verified: false, reason: `the GitHub API answered ${response.status}` };
    }
    const body = await response.json();
    const verification = body?.commit?.verification ?? {};
    return {
      verified: verification.verified === true,
      reason: verification.reason ?? 'unknown',
      login: body?.author?.login ?? null,
    };
  };
}

export function githubGateChangeApprover({
  token,
  repository,
  pullNumber,
  label = gateChangeLabel,
  fetchImpl = globalThis.fetch,
}) {
  return async () => {
    if (!token || !repository || !pullNumber) return false;
    try {
      const response = await fetchImpl(
        `https://api.github.com/repos/${repository}/issues/${pullNumber}/labels?per_page=100`,
        {
          headers: {
            accept: 'application/vnd.github+json',
            authorization: `Bearer ${token}`,
            'user-agent': 'dbrain-push-gate',
          },
        },
      );
      if (!response.ok) return false;
      const labels = await response.json();
      return Array.isArray(labels) && labels.some(item => item?.name === label);
    } catch {
      return false;
    }
  };
}

export function parseVerifyArgs(argv) {
  const options = {
    repository: null,
    base: null,
    head: null,
    advisory: false,
    requireSignature: false,
    json: false,
    merge: false,
  };
  for (const arg of argv) {
    if (arg.startsWith('--repo=')) options.repository = arg.slice('--repo='.length);
    else if (arg.startsWith('--base=')) options.base = arg.slice('--base='.length);
    else if (arg.startsWith('--head=')) options.head = arg.slice('--head='.length);
    else if (arg.startsWith('--pr=')) options.pullNumber = arg.slice('--pr='.length);
    else if (arg === '--merge') options.merge = true;
    else if (arg === '--advisory') options.advisory = true;
    else if (arg === '--require-signature') options.requireSignature = true;
    else if (arg === '--json') options.json = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

export async function verifyCommand(argv, env = process.env) {
  const options = parseVerifyArgs(argv);
  const repository = options.repository ?? env.GITHUB_REPOSITORY ?? '';
  const token = env.GITHUB_TOKEN ?? '';
  const pullNumber = options.pullNumber ?? env.GATE_PR_NUMBER ?? '';

  const gateChangeApproved = await githubGateChangeApprover({
    token,
    repository,
    pullNumber,
  })();

  const check = options.merge ? verifyMergeGate : verifyGate;
  const result = await check(
    {
      repository,
      baseSha: options.base ?? env.GATE_BASE_SHA ?? '',
      headSha: options.head ?? env.GATE_HEAD_SHA ?? 'HEAD',
      requireSignature: options.requireSignature,
      gateChangeApproved,
    },
    { verifySignature: githubSignatureVerifier({ token }) },
  );

  const lines = [];
  const subject = options.merge ? 'The merge on the main branch' : 'The push gate';
  lines.push(result.ok ? `${subject} is accepted.` : `${subject} is rejected.`);
  for (const failure of result.failures) lines.push(`- ${failure}`);
  for (const note of result.notes) lines.push(`- Note: ${note}`);
  const text = lines.join('\n');
  console.log(text);

  if (options.json) console.log(JSON.stringify(result, null, 2));
  if (env.GITHUB_STEP_SUMMARY) {
    appendFileSync(env.GITHUB_STEP_SUMMARY, `## Push gate\n\n${text}\n`);
  }
  if (!result.ok && options.advisory) {
    console.log(`::warning title=Push gate::${result.failures.join(' ')}`);
    return 0;
  }
  return result.ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = await verifyCommand(process.argv.slice(2));
}
