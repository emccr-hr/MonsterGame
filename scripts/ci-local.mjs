#!/usr/bin/env node
// Runs everything CI runs, on this machine (docs/ci-standards.md). Run it before marking a PR ready.
//   npm run ci:local              lint, spelling, data, unit tests, build
//   npm run ci:local -- --full    ...plus the Playwright smoke suite against the build
// Stops at the first failure and prints a summary with timings.
import { spawnSync } from 'node:child_process';

const full = process.argv.includes('--full');

const steps = [
  ['Lint and type check', 'npm run lint'],
  ['Spelling (American English)', 'npm run lint:spelling'],
  ['Data files', 'npm run validate:data'],
  ['Unit tests', 'npm test'],
  ['Build', 'npm run build'],
];
if (full) steps.push(['Smoke tests (Playwright)', 'npm run e2e']);

const results = [];
let failed = false;
for (const [name, cmd] of steps) {
  console.log(`\n=== ${name}: ${cmd}`);
  const start = Date.now();
  // shell: true so `npm` resolves to npm.cmd on Windows.
  const run = spawnSync(cmd, { stdio: 'inherit', shell: true });
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  const ok = run.status === 0;
  results.push({ name, ok, secs });
  if (!ok) {
    failed = true;
    break;
  }
}

console.log('\n=== ci:local summary' + (full ? ' (--full)' : ''));
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (${r.secs}s)`);
const skipped = steps.slice(results.length).map(([name]) => name);
for (const name of skipped) console.log(`  SKIP  ${name}`);
if (!full) console.log('  (Smoke tests not run. Add -- --full when a PR touches scenes, UI or saves.)');

if (failed) {
  console.log('\nci:local FAILED');
  process.exit(1);
}
console.log('\nci:local passed');
