import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const fullScope = () => ({ check: true, containers: true });

function documentation(path) {
  return path.endsWith('.md') || path.startsWith('docs/') ||
    path.startsWith('.agents/') || path.startsWith('.github/ISSUE_TEMPLATE/') ||
    path === 'LICENSE' || path === '.github/dependabot.yml';
}

export function scopeForPaths(paths) {
  const code = paths.filter(path => !documentation(path));
  return {
    check: code.length > 0,
    // Desktop-only resources and Rust changes do not enter the container images.
    // All shared, deployment, lockfile and unknown paths conservatively do.
    containers: code.some(path => !path.startsWith('apps/desktop/') && path !== 'rust-toolchain.toml'),
  };
}

export function scopeForEvent(eventName, event, diff) {
  // Reusable candidate calls inherit workflow_dispatch. Never path-filter them.
  if (eventName !== 'pull_request' && eventName !== 'push') return fullScope();
  let range;
  if (eventName === 'pull_request') {
    const { base, head } = event.pull_request ?? {};
    if (!base?.sha || !head?.sha) return fullScope();
    range = `${base.sha}...${head.sha}`;
  } else {
    if (!event.before || /^0+$/.test(event.before) || !event.after) return fullScope();
    range = `${event.before}..${event.after}`;
  }
  try {
    return scopeForPaths(diff(range));
  } catch (error) {
    // Force-push or unavailable history must increase validation, never skip it.
    console.warn(`Cannot classify changes; running full CI: ${error.message}`);
    return fullScope();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const scope = scopeForEvent(process.env.GITHUB_EVENT_NAME, event, range =>
    execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', range, '--'], {
      encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    }).split('\0').filter(Boolean));
  const output = Object.entries(scope).map(([key, value]) => `${key}=${value}`).join('\n');
  appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `CI scope: ${output.replaceAll('\n', ', ')}\n`);
  }
  console.log(output);
}
