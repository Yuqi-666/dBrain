// The trailer format of the push gate.
//
// The local gate writes one trailer block into the commit message. The CI
// verifier reads it back. The file imports only `node:crypto`, so the verifier
// can load it from the base commit.

import { createHash } from 'node:crypto';

export const trailerOrder = [
  'Gate-Version',
  'Gate-Tree',
  'Gate-Checks',
  'Gate-Env',
  'Gate-Report',
  'Gate-Run',
];

// A stable JSON form. Two equal reports always give the same digest.
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

export function reportDigest(report) {
  const hash = createHash('sha256').update(stableStringify(report)).digest('hex');
  return `sha256:${hash}`;
}

export function buildTrailers(record) {
  return [
    `Gate-Version: ${record.version}`,
    `Gate-Tree: ${record.tree}`,
    `Gate-Checks: ${record.checks.join(',')}`,
    `Gate-Env: ${record.env}`,
    `Gate-Report: ${record.report}`,
    `Gate-Run: ${record.runAt}`,
  ].join('\n');
}

export function buildMessage(subject, body, trailers) {
  const parts = [subject];
  if (body) parts.push(body);
  parts.push(trailers);
  return `${parts.join('\n\n')}\n`;
}

// The parse accepts a loose trailer block. The verifier decides what is valid.
// The function returns null when the message carries no gate line at all.
export function parseTrailers(message) {
  const fields = new Map();
  let present = false;
  for (const line of String(message).split('\n')) {
    const match = /^Gate-([A-Za-z]+):[ \t]*(.*)$/.exec(line);
    if (!match) continue;
    present = true;
    fields.set(match[1].toLowerCase(), match[2].trim());
  }
  if (!present) return null;
  const checks = fields.get('checks');
  return {
    version: fields.has('version') ? Number(fields.get('version')) : Number.NaN,
    tree: fields.get('tree') ?? '',
    checks: checks ? checks.split(',').map(id => id.trim()).filter(Boolean) : [],
    env: fields.get('env') ?? '',
    report: fields.get('report') ?? '',
    runAt: fields.get('run') ?? '',
    fields,
  };
}
