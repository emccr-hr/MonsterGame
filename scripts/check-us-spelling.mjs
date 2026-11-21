#!/usr/bin/env node
// Fails if British/Canadian spelling shows up in code, docs or game text (CLAUDE.md §0.5).
// Word list ported from the Pulse project's check. Run: npm run lint:spelling
//
// Skipped on purpose:
//   00-Raw-Input/   the designer's exact words; never edited (CLAUDE.md §0.8)
//   docs/archive/   historical record
// To name a banned word on purpose (like in this file), put "spelling:ignore-line" on that line.
// `--staged` checks only staged files, as staged (used by .githooks/pre-commit).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Exact whole words only, no stems, so words spelled the same in both (analysis, organism) never trip it.
const BANNED = [
  'colour', 'colours', 'coloured', 'colouring', 'colourful', // spelling:ignore-line
  'flavour', 'flavours', 'flavoured', 'flavouring', // spelling:ignore-line
  'organisation', 'organisations', 'organisational', 'organise', 'organised', 'organising', 'organiser', 'organisers', // spelling:ignore-line
  'behaviour', 'behaviours', 'behavioural', // spelling:ignore-line
  'favourite', 'favourites', // spelling:ignore-line
  'centre', 'centres', 'centred', 'centring', // spelling:ignore-line
  'customise', 'customised', 'customising', 'customisation', // spelling:ignore-line
  'optimise', 'optimised', 'optimising', 'optimisation', // spelling:ignore-line
  'initialise', 'initialised', 'initialising', 'initialisation', // spelling:ignore-line
  'recognise', 'recognised', 'recognising', 'recognisable', 'unrecognised', // spelling:ignore-line
  'realise', 'realised', 'realising', 'realisation', 'realisations', // spelling:ignore-line
  'utilise', 'utilised', 'utilising', 'utilisation', // spelling:ignore-line
  'summarise', 'summarised', 'summarising', // spelling:ignore-line
  'categorise', 'categorised', 'categorising', 'categorisation', // spelling:ignore-line
  'prioritise', 'prioritised', 'prioritising', 'prioritisation', // spelling:ignore-line
  'finalise', 'finalised', 'finalising', // spelling:ignore-line
  'normalise', 'normalised', 'normalising', 'normalisation', // spelling:ignore-line
  'serialise', 'serialised', 'serialising', 'serialisation', // spelling:ignore-line
  'authorise', 'authorised', 'authorising', 'authorisation', // spelling:ignore-line
  'capitalise', 'capitalised', 'capitalising', // spelling:ignore-line
  'itemise', 'itemised', 'itemising', // spelling:ignore-line
  'visualise', 'visualised', 'visualising', 'apologise', 'apologised', // spelling:ignore-line
  'programme', 'programmes', // spelling:ignore-line
  'travelled', 'travelling', 'traveller', 'travellers', // spelling:ignore-line
  'labelled', 'labelling', 'modelled', 'modelling', 'levelled', 'levelling', // spelling:ignore-line
  'fulfil', 'fulfils', 'fulfilment', 'enrolment', 'enrolments', // spelling:ignore-line
  'judgement', 'judgements', // spelling:ignore-line
  'catalogue', 'catalogues', 'cataloguing', // spelling:ignore-line
  'metre', 'metres', 'litre', 'litres', 'theatre', 'theatres', // spelling:ignore-line
  'neighbour', 'neighbours', 'neighbouring', 'neighbourhood', 'neighbourhoods', // spelling:ignore-line
  'honour', 'honours', 'honoured', 'honouring', // spelling:ignore-line
  'rumour', 'rumours', 'humour', 'humours', 'humoured', // spelling:ignore-line
  'endeavour', 'endeavours', 'endeavoured', 'endeavouring', // spelling:ignore-line
  'vapour', 'vapours', 'armour', 'armoured', 'harbour', 'harbours', // spelling:ignore-line
  'labour', 'labours', 'laboured', 'labouring', // spelling:ignore-line
  'mould', 'moulds', 'moulded', 'moulding', // spelling:ignore-line
  'ageing', // spelling:ignore-line
  'defence', 'defences', 'offence', 'offences', 'pretence', 'licence', 'licences', // spelling:ignore-line
  'grey', 'greys', 'greyed', 'greying', // spelling:ignore-line
  'artefact', 'artefacts', // spelling:ignore-line
  'whilst', 'amongst', 'learnt', 'spelt', 'amidst', // spelling:ignore-line
];

const EXTENSIONS = /\.(js|mjs|cjs|ts|tsx|json|md|html|css|yml|yaml|sh)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'test-results', 'playwright-report', 'coverage']);
const SKIP_PATHS = ['00-Raw-Input', path.join('docs', 'archive')];
// Local-only files: settings.local.json is gitignored and may hold anything.
const SKIP_FILES = new Set(['package-lock.json', 'settings.local.json']);
const EXTRA_FILES = [path.join('.githooks', 'pre-commit')];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (SKIP_PATHS.some((p) => rel === p || rel.startsWith(p + path.sep))) continue;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (EXTENSIONS.test(entry.name) && !SKIP_FILES.has(entry.name)) {
      out.push(full);
    }
  }
}

// --staged (the pre-commit hook): check only staged files, as staged, so untracked or unstaged
// edits never pass or block a commit.
const staged = process.argv.includes('--staged');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function wanted(rel) {
  if (EXTRA_FILES.includes(rel)) return true;
  if (SKIP_PATHS.some((p) => rel === p || rel.startsWith(p + path.sep))) return false;
  if (rel.split(path.sep).some((part) => SKIP_DIRS.has(part))) return false;
  const name = path.basename(rel);
  return EXTENSIONS.test(name) && !SKIP_FILES.has(name);
}

const files = [];
if (staged) {
  for (const f of git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split('\0')) {
    if (f && wanted(path.normalize(f))) files.push(path.join(ROOT, f));
  }
} else {
  walk(ROOT, files);
  for (const f of EXTRA_FILES) if (fs.existsSync(path.join(ROOT, f))) files.push(path.join(ROOT, f));
}

const read = (file) =>
  staged ? git('show', `:${path.relative(ROOT, file).split(path.sep).join('/')}`) : fs.readFileSync(file, 'utf8');

const wordRe = new RegExp(`\\b(${BANNED.join('|')})\\b`, 'i');
let hits = 0;
for (const file of files) {
  read(file)
    .split('\n')
    .forEach((line, i) => {
      if (line.includes('spelling:ignore-line')) return;
      const m = wordRe.exec(line);
      if (m) {
        hits++;
        console.log(`${path.relative(ROOT, file)}:${i + 1}: "${m[1]}": use American spelling`);
      }
    });
}

if (hits > 0) {
  console.log(`\n${hits} British/Canadian spelling(s) found.`);
  process.exit(1);
}
console.log(`Spelling: ${files.length} files checked, no British/Canadian spellings.`);
