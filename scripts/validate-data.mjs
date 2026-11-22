#!/usr/bin/env node
// Checks the game's content files in src/data/ (ADR 0003). Run: npm run validate:data
//   --list   also print the monster table, to compare with 04-Characters/Monster-List.md
// The schemas (src/data/schema.ts) and cross-checks (src/data/validate.ts) are TypeScript; Node runs
// them directly (type stripping, Node 24+). Keep this fast: it runs in the pre-commit hook.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const FILES = ['monsters', 'moves', 'abilities', 'biomes', 'items', 'rules', 'guide'];

const raw = {};
let problems = 0;
for (const name of FILES) {
  const file = path.join(DATA, `${name}.json`);
  if (!fs.existsSync(file)) {
    console.error(`src/data/${name}.json: missing`);
    problems++;
    continue;
  }
  try {
    raw[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`src/data/${name}.json: not valid JSON: ${e.message}`);
    problems++;
  }
}
if (problems) fail(problems);

const { validateContent, gateMonsters } = await import(pathToFileURL(path.join(DATA, 'validate.ts')).href);
const { errors, warnings, content } = validateContent(raw);
for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(e);
if (errors.length) fail(errors.length);

if (process.argv.includes('--list')) {
  console.log('\nMonster | Biome | Spawn | Scale | Evolves into (level) | Ability | Moves');
  for (const m of content.monsters) {
    const evo = m.evolvesTo ? `${m.evolvesTo.monster} (${m.evolvesTo.level})` : 'final';
    console.log(`${m.name} | ${m.biome ?? '-'} | ${m.kind === 'boss' ? 'boss' : (m.spawnWeight ?? 'evolve only')} | ${m.scale} | ${evo} | ${m.ability ?? '-'} | ${m.moves.join(', ')}`);
  }
  console.log('');
}

const gate = gateMonsters(content);
console.log(
  `validate:data: OK. ${content.monsters.length} monsters (${gate.length} wild for the Avatar gate), ` +
    `${content.moves.length} moves, ${content.abilities.length} abilities, ${content.biomes.length} biomes, ` +
    `${content.items.length} items, ${content.guide.tips.length} guide tips.`,
);

function fail(n) {
  console.error(`\nvalidate:data: ${n} problem(s).`);
  process.exit(1);
}
