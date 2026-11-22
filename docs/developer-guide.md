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
| `src/data/maps/` | World maps as character grids (M3; legend at the top of `index.ts`) |
| `src/world/` | Reading map grids (tiles, gates, reachability); no Phaser, unit tested |
| `src/config.ts` | Screen size, colors, save key |
| `src/testHook.ts` | `window.__TEST__` for smoke tests |
| `tests/unit/` | Vitest, mirroring `src/logic/` |
| `tests/smoke/` | Playwright, about 5 flows |
| `scripts/` | `ci-local`, spelling, data validation, hooks setup, `merge-if-green` |
| `src/assets/sprites/` | Vector sprites (M8): `monsters/<monster id>.svg`, `characters/*.svg`, found by file name |
| `tools/sprite-gallery.html` | Dev-only page showing every sprite (`npm run dev`, then `/tools/sprite-gallery.html`) |
| `public/assets/` | Tiles, audio (later milestones) |

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

## The world (M3)
- Scenes: `Title` → `PickBiome` (New Game) → `Ansonville`; biome scenes are named after the biome
  (`Forest`, `Beach`, `Desert`, `Snowy`, `Volcano`). One `MapScene` class draws every map.
- Maps are grids of characters in `src/data/maps/index.ts`, 32 px per tile. Edit a row, and
  `tests/unit/world/maps.test.ts` checks it's still a rectangle with reachable gates, shop and Reviver.
- Encounter ground fires `WILD_ENCOUNTER` on `game.events` (`src/scenes/events.ts`) with
  `{ biomeId, sceneKey, tile }`. `src/scenes/encounterFlow.ts` pauses that map and runs `Battle` (M4).
- World state (open biomes, position, tips seen) is part of the game state; `src/state/world.ts` is
  the map scenes' view of it.
- Dev builds only: press **U** on a map to open every gate.

## Catching and battles (M4)
- The game in play is the M2 `GameState`, held in `src/state/game.ts` (`getGame`, `setGame`,
  `saveGame`, `loadGame`). It saves to localStorage when you enter a map, use a Reviver, or finish a
  battle. Title's **Continue** loads it.
- `BattleScene` (key `Battle`) runs on top of the paused map: `startWildEncounter` → `resolveTurn`
  each turn → `finishBattle`, then it resumes the map. If you lose, it starts the map of your last
  Reviver instead, next to the Reviver. Catching is the Cage action inside the battle (the cage
  grows as it flies, then wobbles).
- What the screen says (menus, battle text, sprite sizes) is in `src/logic/battleUi.ts`, with tests.
- Keys: arrows/WASD pick, Enter/Space choose or skip text, Esc goes back, **F** toggles 2x speed.
- Test-only seed: `?seed=123` makes the dice repeat (map steps and battles). `tests/smoke/battle.spec.ts` uses it.
- Placeholder art: a rounded vector body in the biome's element color, sized by
  `battleSpriteSize(scale)` = `clamp(72·√scale, 56, 240)` px; Big Monsters are 1.25x with a star.

## How to add a monster
No code change needed (ADR 0003). Schemas: `src/data/schema.ts`; cross-checks: `src/data/validate.ts`.
1. Write it in the design docs first (`04-Characters/`), with the designer's OK.
2. Add one entry to `src/data/monsters.json`. Moves must exist in `moves.json` and the ability in
   `abilities.json`. A wild first form gets a `spawnWeight` (weights, not percentages; the biome
   rescales). An evolution gets `spawnWeight: null`, and both forms must point at each other
   (`evolvesTo` / `evolvesFrom`). Base stats follow the rule in `02-Gameplay/Balance.md`.
3. `npm run validate:data -- --list` (prints the monster table), then `npm test`. The unit test that
   expects 30 monsters and 3 per biome will need its numbers updated; that's on purpose.
4. Art: add `src/assets/sprites/monsters/<id>.svg` (see "Vector sprites (M8)"). Until then the game
   draws a placeholder from the monster's `art` look data.

## Commits, PRs and merging
- Branch per task; parallel sessions use worktrees beside the clone (`..\MonsterGame-<name>`).
- The pre-commit hook checks spelling, blocks `.env` files and anything that looks like a key, and
  validates data files when they change.
- Draft PR → `ci:local` → mark ready once → push once. CI is one job and skips drafts and docs-only changes.
- Merge only with `node scripts/merge-if-green.mjs <pr>` (ADR 0007).

## Team, Bag, Monster Book and evolving (M5)
- **M** on any map (or the "M: Menu" button) pauses the map and opens `Menu` (`src/scenes/MenuScene.ts`):
  Team and Backpack (`Team`), `Bag`, Monster Book (`Book`), Save. Each screen gets `{ map }` (the paused
  map's scene key); Esc goes back to the menu, and closing the menu resumes the map.
- The rules behind the screens are in `src/logic/collection.ts` (swapping, backpack sorting, the Book's
  entries and counters, evolving, which item can go to which monster), with tests.
- Menu screens use `ListMenu` and `bindMenuKeys` from `src/ui/listMenu.ts`. Keys bound with `onKey`
  ignore the first 150 ms after a screen opens, because the key that opened the screen is otherwise
  handled again by the new screen in the same frame. The map does the same after it resumes.
- Monsters are drawn by `drawMonster` in `src/ui/monsterArt.ts`, shared by every screen.
- **Evolving:** after a won battle, every team monster at its evolve level runs the `Evolve` scene
  (`src/scenes/EvolveScene.ts`), then the map resumes.
- In battle, **Bag** opens a target picker: pick the item, then who gets it.
- Dev builds only: **L** on a map levels the team up to the next evolve level and evolves it (to
  reach evolving fast in a play-test).

## Shop and map parts (M6)
- Walking into a shop tile opens `Shop` (`src/scenes/ShopScene.ts`) on top of the paused map. Rows
  come from `shopRows` in `src/logic/shop.ts`: every item in `items.json` except the map part, then a
  "Map Part: <biome>" row per locked biome. ←→ changes how many, Enter asks "Buy …?", Enter again buys.
- Buying a map part opens the biome at once (`buyMapPart`); leaving the shop restarts the map where
  the player stands so the gate shows open.
- The map HUD shows gems and cages; the Avatar arena gate says "Monsters caught: X / 15".

## Papai, the game expert (ADR 0008)
- Papai answers from `src/data/guide.json`: `tips` (first-time), `topics` (questions and answers, with
  what each `covers`) and `goals` ("What should I do next?", first match wins). Conditions are in
  `src/logic/guide.ts`. Players open him at his spot in Ansonville or with M → Ask Papai (`PapaiScene`).
- `tests/unit/data/guideCoverage.test.ts` fails when a screen, key or item has no topic. Fix it in
  `guide.json`. The `gameplay-expert` skill keeps the answers true when features change.

## Save files
- The game autosaves to localStorage (`src/state/game.ts`). That save is **per browser and per address**:
  `npm run dev` (localhost:5173) and `npm run preview` (localhost:4173) keep separate saves.
- Backup: M menu → **Save to file** downloads the save as JSON; Title → **Load save file** loads one
  (`src/state/saveFile.ts`, using `serialize`/`deserialize` from `src/logic/save.ts`).

## Vector sprites (M8)
- **One SVG per monster**, named by its id: `src/assets/sprites/monsters/<id>.svg`. Dropping a file in
  adds the sprite; no code change (ADR 0003). A monster without a file is drawn from its `art` look
  data (`drawPlaceholder` in `src/ui/monsterArt.ts`), so nothing is ever missing.
- **Characters:** `src/assets/sprites/characters/`: `player` and `papai` (full size, Ask Papai),
  `player-map` and `papai-map` (32x40, one map tile wide).
- **Drawing rules:** a `viewBox` (monsters `0 0 100 100`; the monster fills the square box that
  "N x Dumble" scales), `xmlns`, no scripts, images or links to other files (filters like
  `url(#glow)` must be defined in the same file). Monsters **face left** (or the front); the
  player's side in battle mirrors them. Dark outlines, round line caps, flat colors, as in
  `06-Art-and-Audio/Art-Mockups.html`.
- **How they load:** `src/ui/sprites.ts` finds the files with Vite's `import.meta.glob` (as text),
  and Boot rasterizes each monster at 64, 128 and 256 px (`SPRITE_TIERS`) with smooth filtering;
  `drawMonster` picks the nearest size at least as big as the drawing. File-name and SVG rules are
  in `src/ui/spriteManifest.ts` (no Phaser), tested by `tests/unit/ui/sprites.test.ts`, which also
  fails if one of the 15 base monsters, the player or Papai loses its sprite.
- **See them all:** `npm run dev`, then open `/tools/sprite-gallery.html`; pink cards have no sprite yet.
- **The designer's drawings** can replace a file later (traced to SVG, same name).
