#!/usr/bin/env node
// Checks the game's content files in src/data/ (ADR 0003). Run: npm run validate:data
//
// M0: every *.json under src/data/ must parse. M1 adds the Zod schemas (src/data/schema.ts) and the
// cross-checks listed in docs/ci-standards.md (moves exist, evolve levels 1–100, every biome has a
// wild monster, and so on). Keep this script fast: it runs in the pre-commit hook.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');

const files = fs.existsSync(DATA) ? fs.readdirSync(DATA, { recursive: true }).filter((f) => String(f).endsWith('.json')) : [];

let errors = 0;
for (const f of files) {
  const full = path.join(DATA, String(f));
  try {
    JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    errors++;
    console.error(`src/data/${f}: not valid JSON: ${e.message}`);
  }
}

if (errors) {
  console.error(`\nvalidate:data: ${errors} problem(s).`);
  process.exit(1);
}
console.log(
  files.length
    ? `validate:data: ${files.length} data file(s) parse. (Schemas and cross-checks arrive in M1.)`
    : 'validate:data: no data files yet. (Content arrives in M1.)',
);
