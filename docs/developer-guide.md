# Developer guide

How to set up, run and change Magic and Monsters. Read `HANDOFF.md` and `CLAUDE.md` first for the
rules; this file is the "how."

## Setup
1. Install **Node 26** (see `.nvmrc`) and git.
2. `npm install`. This also points git at `.githooks/` so the pre-commit hook runs.
3. For smoke tests, once per machine: `npx playwright install chromium`.

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload at http://localhost:5173 |
| `npm run build` | Production build into `dist/` (static files, ADR 0006) |
| `npm run preview` | Serves `dist/` at http://localhost:4173 |
| `npm run lint` | ESLint, then `tsc --noEmit` |
| `npm run lint:spelling` | American English check (skips `00-Raw-Input/`, the designer's own words) |
| `npm run validate:data` | Checks `src/data/*.json` (schemas and cross-checks from M1) |
| `npm test` | Vitest unit tests (`tests/unit/`) |
| `npm run e2e` | Builds, then runs the Playwright smoke tests (`tests/smoke/`) |
| `npm run ci:local` | Everything CI runs: lint, spelling, data, unit tests, build |
| `npm run ci:local -- --full` | ...plus the smoke tests (builds first) |

Run `ci:local` before marking a PR ready (`docs/ci-standards.md`). Add `--full` when a PR touches
scenes, UI or saves.

## Folder map
| Folder | What goes there |
|---|---|
| `src/logic/` | Game rules. Plain TypeScript: no Phaser, no `window`, no `Math.random` (use `Rng` from `rng.ts`). ESLint enforces this (ADR 0002). |
| `src/data/` | Content as JSON (monsters, moves, biomes, items, guide tips) plus Zod schemas (M1, ADR 0003) |
| `src/scenes/` | Phaser scenes. They call logic; logic never calls them. |
| `src/ui/`, `src/state/` | Shared widgets; game-state store and save glue (from M2) |
| `src/config.ts` | Screen size, colors, save key |
| `src/testHook.ts` | `window.__TEST__` for smoke tests |
| `tests/unit/` | Vitest, mirroring `src/logic/` |
| `tests/smoke/` | Playwright, about 5 flows |
| `scripts/` | `ci-local`, spelling, data validation, hooks setup, `merge-if-green` |
| `public/assets/` | Sprites, tiles, maps, audio (from M3) |

## Randomness
Every rule that rolls dice takes an `Rng` (`createRng(seed)`). Same seed, same results, so tests are
exact. `rng.getState()` / `setState()` let a save file pick up the same sequence. A unit test pins the
first numbers for seed 12345: if it fails, the generator changed, and old saves would replay
differently. Don't update that snapshot without a reason in the PR.

## The test hook
Smoke tests read `window.__TEST__` instead of scraping the canvas:
- `ready`: true once the title screen is up.
- `state()`: a frozen copy of what the player sees, e.g. `{ scene: 'Title', selected: 'New Game', ... }`.

Scenes call `reportState({...})` from `src/testHook.ts` whenever that changes. The hook exists in dev
builds, and in production builds only with `?test` in the address. Tests drive the game with the
keyboard and mouse, never through the hook. Smoke tests run one at a time, because several headless
WebGL pages at once stalled on the dev laptop.

## How to add a monster
From M1 on (no code change needed, ADR 0003):
1. Write it in the design docs first (`04-Characters/`), with the designer's OK.
2. Add an entry to `src/data/monsters.json` (moves must exist in `moves.json`, the ability in
   `abilities.json`); add it to a biome's spawn table in `biomes.json` if it's wild.
3. `npm run validate:data`, then `npm test`.
4. Art (from M8): a placeholder is drawn automatically until a sprite exists in `public/assets/sprites/`.

## Commits, PRs and merging
- Branch per task; parallel sessions use worktrees beside the clone (`..\MonsterGame-<name>`).
- The pre-commit hook checks spelling, blocks `.env` files and anything that looks like a key, and
  validates data files when they change.
- Draft PR → `ci:local` → mark ready once → push once. CI is one job and skips drafts and docs-only changes.
- Merge only with `node scripts/merge-if-green.mjs <pr>` (ADR 0007).
