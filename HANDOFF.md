# Handoff: Magic and Monsters

**Read this first in any new session**, then `CLAUDE.md` §0 (house rules), the top of `STATUS.md`,
and `09-Production/Development-Plan.md`. Whoever orchestrates keeps this file current: update
**State**, **Next**, and **Waiting on** whenever something lands.

## Context
- **Magic and Monsters** is a monster-catching browser game **designed by a 10-year-old**, with his parent (the owner, GitHub `emccr-hr`) helping. Separate from the owner's Pulse work.
- Goal: a **simple, fun** game that matches his vision. He drives themes and choices. We suggest numbers and engineering, and ask when it matters.
- His exact words: `00-Raw-Input/Kid-Description.md` (61 rounds; voice-typing slips are noted under each round).
- Repo: https://github.com/emccr-hr/MonsterGame (public, `main`). It may later move to another account the owner controls.

## State (2026-11-22)
- **M2 Core rules merged (PR #13):** every rule in `src/logic/` with unit tests; `encounter.ts` is the glue the M4 scenes call (`startWildEncounter`, `finishBattle`).
- **Design complete. M0 Foundation merged (PR #3):** Phaser 4.2.1 + Vite 8 + TypeScript 6.0 skeleton that boots to a Title screen (New Game / Continue), seeded RNG (`src/logic/rng.ts`), `window.__TEST__` hook, ESLint/`tsc`/spelling/data checks, `npm run ci:local` (`--full` adds 3 Playwright smoke tests), pre-commit hook, one-job `ci.yml`. How-to: `docs/developer-guide.md`.
- **M1 Content as data merged (PR #7):** all content in `src/data/*.json` (31 monsters incl. Avatar, 45 moves, 10 abilities, 5 biomes, 5 items, `rules.json`, `guide.json`), Zod schemas in `schema.ts`, cross-checks in `validate.ts`, loaded for the game by `src/data/index.ts`. Proposed numbers (base stats, power tiers, effect amounts) in `02-Gameplay/Balance.md`.
- **M3 World merged (PR #9):** New Game → pick a biome → Ansonville hub (36x22 grid) with shop, Reviver and guide spots ("coming soon"), 5 biome gates (locked ones say "Map part needed") and the locked Avatar arena; 5 one-screen biome maps; arrow keys/WASD grid movement, camera, gate transitions. Maps are **character grids in `src/data/maps/index.ts`, not Tiled** (Decisions-Log). Step encounters on grass/sand/snow/ash fire `WILD_ENCOUNTER` on `game.events` (`src/scenes/events.ts`, payload `{ biomeId, sceneKey, tile }`) and show "A wild monster appears!"; the roll is `stepOnEncounterGround` in `src/logic/encounterRate.ts`. Scene keys: `Title`, `PickBiome`, `Ansonville`, `Forest`, `Beach`, `Desert`, `Snowy`, `Volcano` (one `MapScene` class). Minimal world state in `src/state/world.ts` (`openBiomes`, position, tips seen; `openBiome()` for M6) — fold it into the M2 game state and save. Dev builds: **U** opens every gate. How-to: `docs/developer-guide.md` "The world (M3)".
- **Playable now:** walk Ansonville and your picked biome; encounters only show a message. Catching and battles arrive with M4.
- **Art direction (PRs #10, #11):** **vector** placeholder art (not pixel); chosen palette (playful primaries, a theme per area) and approved looks for Ansonville, gates, arena, shop, Reviver and items; "N x Dumble" scales every dimension, battle sprites compressed (proposed `clamp(72*sqrt(N), 56, 240)` px, not yet OK'd). Player (working look): a boy with shoulder-length blonde hair, light skin, blue eyes. Guide: **Papai**, a bald man with a dark mustache who explains the game when needed and points to quests and goals. All in `06-Art-and-Audio/Art-Mockups.html` and Art-Direction.md. PR #11 (round 2) may still be open: check before relying on it.
- **Owner's direction (2026-11-21):** get through M1–M4 as fast and efficiently as possible; fun and polish can wait. Build the simplest option where a design question is open, and ask the designer in parallel.
- **Laptop memory is tight** (it ran out once with Firefox open). Keep parallel sessions to what fits.
- **Merging:** owner's standing rule (ADR 0007, PR #2): merge only with `node scripts/merge-if-green.mjs <pr>` (`--docs-only` for docs PRs).
- TypeScript stays on 6.0 until typescript-eslint supports 7. Smoke tests run one at a time (parallel headless WebGL stalled on the laptop).
- Planning docs: `09-Production/Development-Plan.md` (milestones M0–M9), `docs/ci-standards.md`, ADRs 0001–0007, `01-Vision/Genre-Research.md`, filled-in Controls, UI, Tech, Audio and Characters docs.
- The `design-buddy` skill exists for talking with the designer.

## Next
1. **M2 Core rules merged (PR #13):** `src/logic/` battle, catching, growth, spawning, game, world, encounter (start/finish a battle: XP, gems, catch, wake at the last Reviver), save. 288 unit tests.
2. **M4 Catching and battles** joins M2 and M3: listen for `WILD_ENCOUNTER`, pause the map scene, run the catch/battle scenes on M2's rules, resume `sceneKey`; first catch with no team offers only "Throw cage"; losing wakes you at the last Reviver. Move `src/state/world.ts` into the M2 game state.
3. Small follow-ups: switch the map colors in `src/data/maps/index.ts` to the chosen palette rows in `Art-Mockups.html`; merge PR #11 if still open.

## Orchestrator's job (lighter version of Pulse's)
1. Start **one or two** focused work sessions at a time, each with a brief: files, exit criteria, "read HANDOFF.md first", worktree at `..\MonsterGame-<name>`.
2. **Verify, don't trust:** check the PR, run `npm run ci:local`, and look at the change before telling the owner it's done.
3. **Merging (standing rule, ADR 0007):** merge any PR whose CI is green with `node scripts/merge-if-green.mjs <pr>`. Docs-only PRs (no CI): review, then `--docs-only`. Never `gh pr merge` directly. Ask the owner about anything unusual (a red check you think is a flake, a security-sensitive change).
4. **PRs don't edit `STATUS.md`**: each PR body has a STATUS line, and the orchestrator adds the row after merging.
5. **CI minutes:** draft PRs, `ci:local` first, mark ready once, push once (`docs/ci-standards.md`).
6. When the build needs a design answer, collect questions and ask through **`design-buddy`** (kid-friendly, 1–3 questions at a time). Record answers in the design docs and Decisions-Log.
7. After each milestone, have a **play-test build** ready for the designer, and capture his reactions as a new raw-input round.

## Hard rules (summary; full list in CLAUDE.md §0)
- **Original content only** (Flags N1, N2). Avatar's look must be original: a body made of the 5 elements.
- **Data-driven monsters** (ADR 0003). **Rules in `src/logic/`**, no Phaser imports (ADR 0002).
- **No live AI or API keys in the game** (ADR 0004). The guide character uses scripted hints.
- Archive, don't delete. American English. Never commit secrets.

## The game in one screen
| Area | What's decided | Where |
|---|---|---|
| Start | Ansonville (center of map), **no starter monster**, **100 cages** + 100 Magic Gems; pick 1 biome to open | Mechanics.md |
| World | 5 biomes (Forest, Beach, Desert, Snowy, Volcano) around Ansonville; others open by buying their map part | Setting.md |
| Catching | Throw a cage now or battle first; lower HP means a better chance; the tiny cage grows big | Mechanics.md |
| Battles | Turn-based 1v1, 4 moves, 1 ability, no types; element tags; only statuses are Burned and Frozen | Mechanics.md, Move-List.md |
| Team | 6 at the ready, unlimited backpack | Mechanics.md |
| Growth | Max level 100; each monster evolves at its own level (15–45) | Monster-List.md |
| Monsters | 30 (15 families, 3 wild per biome), spawn weights, Big Monster 1 in 100 | 04-Characters/ |
| Economy | Magic Gems; Cage 10, Potion 15, Wake-Up Snack 30, Map part 50, Teleport pin 100 | Progression-and-Economy.md |
| Healing | Free Reviver next to every shop | Mechanics.md |
| Level 50 | Teleport to shops plus 5 placeable pins | Mechanics.md |
| Ending | Catch all 15 wild monsters → Avatar arena in Ansonville → beat Avatar | Final-Boss.md |
| Art | Base character art first, placeholders elsewhere, his drawings later | Art-Direction.md |

## Waiting on
- **Designer (via design-buddy):** Open-Questions section **F** (research ideas: visible wild monsters, catch streaks, partner, throw timing, tough trainers) and what's left of **G** (player outfit, picking a look and a name; Papai's personality). Confirm Peggy's new big body spot (her doc says "white spots on her neck and head").
- **Owner:** OK or change the proposed battle size rule.
- **Owner:** confirm the section E defaults (C7, C8, X18, X19) when convenient; the final repo home and deploy host (ADR 0006).

## Folder map
See `README.md` and `CLAUDE.md` §1.
