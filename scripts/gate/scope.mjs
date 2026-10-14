// The path policy of the push gate.
//
// This module imports nothing. The CI verifier loads this file from the base
// commit, so a pull request cannot weaken the policy that judges it.

const cache = new Map();

export function globToRegExp(glob) {
  const cached = cache.get(glob);
  if (cached) return cached;
  let source = '';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*') {
      if (glob[index + 1] === '*') {
        if (glob[index + 2] === '/') {
          // `**/` also matches zero directories, so `**/*.ts` matches `a.ts`.
          source += '(?:[^/]+/)*';
          index += 2;
        } else {
          source += '.*';
          index += 1;
        }
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  const compiled = new RegExp(`^${source}$`);
  cache.set(glob, compiled);
  return compiled;
}

export function matchesAny(path, globs) {
  return globs.some(glob => (glob === '*' ? true : globToRegExp(glob).test(path)));
}

// The documentation list of the pipeline. A manual-only change skips every
// check except the checks with the scope `*`.
export function isDocumentation(path) {
  return (
    path.endsWith('.md') ||
    path.startsWith('docs/') ||
    path.startsWith('.agents/') ||
    path.startsWith('.github/ISSUE_TEMPLATE/') ||
    path === 'LICENSE' ||
    path === '.github/dependabot.yml'
  );
}

export function codePaths(paths) {
  return paths.filter(path => !isDocumentation(path));
}

export function localChecks(definition) {
  return definition.checks.filter(check => check.runner === 'local' && check.required);
}

// The check ids that the change requires, in the order of the definition.
export function requiredCheckIds(paths, definition) {
  const code = codePaths(paths);
  return localChecks(definition)
    .filter(check => matchesAnyScope(code, check.scope))
    .map(check => check.id);
}

// Every local check runs, whether the change touches it or not. The option
// `--full` selects this behaviour.
export function allLocalCheckIds(definition) {
  return localChecks(definition).map(check => check.id);
}

function matchesAnyScope(paths, scope) {
  if (scope.includes('*')) return true;
  return paths.some(path => matchesAny(path, scope));
}

// The tracked files that the deny list rejects.
export function findDeniedTracked(paths, definition) {
  const rules = definition.trackedDeny.map(rule => ({
    ...rule,
    regexp: new RegExp(rule.pattern),
  }));
  const found = [];
  for (const path of paths) {
    for (const rule of rules) {
      if (rule.regexp.test(path)) {
        found.push({ path, reason: rule.reason });
        break;
      }
    }
  }
  return found;
}

// The tracked files that change the gate itself.
export function findProtected(paths, definition) {
  return paths.filter(path => matchesAny(path, definition.protectedPaths));
}
