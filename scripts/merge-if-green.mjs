#!/usr/bin/env node
// Merge a PR only when CI is green (owner's standing rule, 2026-11-21).
// Usage:  node scripts/merge-if-green.mjs <pr-number> [--docs-only]
//
// Refuses unless: the PR is open, targets main, isn't a draft, has no merge conflicts, and has at least
// one CI check where every check finished as success, skipped or neutral.
// Docs-only PRs run no CI (docs/ci-standards.md). Pass --docs-only to merge one; the script then checks
// that every changed file is a docs path and that the PR has no checks at all.
// Always merges the exact head commit it checked (--match-head-commit), so a late push can't slip in.
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const pr = args.find((a) => /^\d+$/.test(a));
const docsOnly = args.includes('--docs-only');
if (!pr) fail('Usage: node scripts/merge-if-green.mjs <pr-number> [--docs-only]');

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8' });
const info = JSON.parse(
  gh('pr', 'view', pr, '--json', 'number,state,isDraft,baseRefName,headRefOid,mergeable,files,statusCheckRollup,title'),
);

if (info.state !== 'OPEN') fail(`PR #${pr} is ${info.state}, not open.`);
if (info.baseRefName !== 'main') fail(`PR #${pr} targets ${info.baseRefName}, not main.`);
if (info.isDraft) fail(`PR #${pr} is a draft. Mark it ready first (gh pr ready ${pr}).`);
if (info.mergeable !== 'MERGEABLE') fail(`PR #${pr} is not mergeable (${info.mergeable}). Resolve conflicts first.`);

const checks = info.statusCheckRollup ?? [];
const DOC_PATH = (p) => p.endsWith('.md') || p.startsWith('docs/') || /^\d\d-/.test(p);

if (docsOnly) {
  const nonDocs = info.files.map((f) => f.path).filter((p) => !DOC_PATH(p));
  if (nonDocs.length) fail(`--docs-only, but these files aren't docs:\n  ${nonDocs.join('\n  ')}`);
  if (checks.length) fail('--docs-only, but the PR has CI checks. Merge it without --docs-only once they are green.');
} else {
  if (!checks.length) fail(`PR #${pr} has no CI checks. If it's docs only, re-run with --docs-only.`);
  const bad = checks.filter((c) => {
    const status = c.status ?? 'COMPLETED';
    const result = c.conclusion ?? c.state;
    return status !== 'COMPLETED' || !['SUCCESS', 'SKIPPED', 'NEUTRAL'].includes(result);
  });
  if (bad.length) {
    fail(`PR #${pr} is not green:\n  ${bad.map((c) => `${c.name ?? c.context}: ${c.status ?? ''} ${c.conclusion ?? c.state ?? ''}`).join('\n  ')}`);
  }
  if (!checks.some((c) => (c.conclusion ?? c.state) === 'SUCCESS')) fail(`PR #${pr} has no successful check.`);
}

console.log(`Merging PR #${pr} "${info.title}" at ${info.headRefOid.slice(0, 7)} (${docsOnly ? 'docs only' : `${checks.length} checks green`}).`);
gh('pr', 'merge', pr, '--merge', '--delete-branch', '--match-head-commit', info.headRefOid);
console.log(`PR #${pr} merged.`);

function fail(msg) {
  console.error(`merge-if-green: ${msg}`);
  process.exit(1);
}
