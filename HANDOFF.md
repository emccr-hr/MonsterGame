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
- **M5 merged (PR #19):** **M** (or the "M: Menu" button) opens Team and Backpack (pick up and swap, Tab sorts), Bag (target picker, also in battle), Monster Book (seen/caught/Big, "Wild monsters caught: X / 15"), Ask Papai, Save. Monsters evolve right after the battle where they reach their level (`Evolve` scene). Rules in `src/logic/collection.ts`; list widget `src/ui/listMenu.ts`. Dev builds: **L** levels the team to its evolve level. How-to: developer guide "Team, Bag, Monster Book and evolving (M5)".
- **M6a merged (PR #20):** shop (`ShopScene`, `src/logic/shop.ts`): cages, potions, snacks, pins, and one map part per locked biome (buying opens the gate at once). Gems and cages on the map HUD; arena gate shows "Monsters caught: X / 15". **M6b not built:** teleport menu and pins, Avatar battle, ending and credits.
- **Papai is the game expert (PR #21, ADR 0008):** Ask Papai at his spot or from the menu; "What should I do next?" from the game state plus 20 scripted answers in `src/data/guide.json` (`topics`, `goals`); `tests/unit/data/guideCoverage.test.ts` fails when a screen, key or item has no answer; dev-side `gameplay-expert` skill keeps it current.
- **Sharp rendering (PR #44):** canvas at `RENDER_SCALE` (1 or 2) with every camera zoomed from the top-left (`src/ui/display.ts`); don't use `startFollow`/`setBounds` (MapScene uses `cameraScrollFor`); `?test` stays 1x. The Monster Book scrolls (6 rows).
- **Effects, water, arena art (PR #42):** `src/ui/battleFx.ts` (move shots and element bursts, status and heal effects, cage trail, caught burst, break-free puff); `drawWater` in `mapArt.ts` (waves, lava, quicksand); arena art `arena-sealed`/`arena-open` over the arena tiles. Ansonville has grassy spots where any first form can appear (PR #40, Round 71).
- **Rounds 68–69 (PRs #35, #37):** Blizzard Boy → Rock Crystal (Deep Freeze, a new ability rule `freezeChanceBonus`; "Iceman" renamed, Flags N3) and ten Claude-made families with new abilities that reuse existing rules. **65 monsters, 32 wild for the Avatar gate**: the designer says that is not too many (Round 70). Battle text names the real ability (`abilityName` in `battleUi.ts`). Stacked PRs: merging the base deletes its branch and GitHub closes the stacked PR (#36 → reopened as #37), so retarget to `main` before merging the base.
- **Designer rounds 64–67 (PR #33):** 43 monsters (21 wild for the Avatar gate; the Beach, Desert and Volcano have 5 wild each, weights 140). New: Mr. Toothache → Megalodon (Round 64, his design; Megalodon's look proposed), Crystalump → Crystower, Lanternpuff → Blazelantern, Sandcastlet → Sandfortress, Tumbleball → Dustwhirl, Lavamug → Lavakettle (Claude-made at his request; his OK on the looks is still welcome). Biome maps are 38x17 with 8 grass patches; the Beach has big palms and coconuts (`decor` on maps).
- **Visible wild monsters (PR #31, designer Round 62):** 5 wander on encounter ground in each biome (`src/ui/wildWalkers.ts`, rules in `src/logic/wildWalkers.ts`); walking into one battles exactly it (`startWildEncounter(..., seen)`); Big ones are 1.5x bigger, no star; hidden surprises stay at 4% a step (`SURPRISE_ENCOUNTER_RATE`). Test hook: `wild` on map state.
- **M8 round 2 (PR #28):** item pictures in `src/assets/sprites/items/` (Shop, Bag, battle cage throw); map art in `tiles/` (Shop, Reviver, open and locked gates, a tree per area) placed by `src/ui/mapArt.ts`. **Audio:** original songs and sound effects as notes in `src/data/audio.json`, played by `src/ui/audio.ts` (`playMusic(areaId)`, `playSfx(id)`; `playMusic('avatar')` is ready for the Avatar battle); M menu → Sound: Off/Low/Medium/High; licenses in `06-Art-and-Audio/Audio-Credits.md` (all original). Designer drawings → sprites: `06-Art-and-Audio/Designer-Drawings-How-To.md`.
- **Vector art, first version (M8, PR #26, owner approved all 31 sprites):** one SVG per monster in `src/assets/sprites/monsters/<id>.svg` (player and Papai in `characters/`), found by file name, rasterized in Boot; `drawMonster` uses the sprite or falls back to the look data. Battle, Team, Book, Evolve, Ask Papai, and the map (player, Papai). Dev page `/tools/sprite-gallery.html`. How-to: developer guide "Vector sprites (M8)".
- **A look per monster (PR #22):** `art: { body, accent, markings }` in `monsters.json`, drawn by `src/ui/monsterArt.ts` everywhere; brighter Desert/Snowy/Volcano map colors. Owner decisions of 2026-11-22 recorded (PR #18).
- **M4 Catching and battles merged (PR #15):** `WILD_ENCOUNTER` → `src/scenes/encounterFlow.ts` pauses the map and runs `Battle` (`src/scenes/BattleScene.ts`), which resumes the map after. The first catch is cage-only. The cage throw is animated inside the battle (no separate catch scene). F = 2x speed. Losing wakes you beside your last Reviver; Revivers heal for free. The game in play is the M2 `GameState` in `src/state/game.ts` (world state folded in), saved to localStorage; Title **Continue** works. Menu and text rules are in `src/logic/battleUi.ts`. Test-only `?seed=`. How-to: developer guide "Catching and battles (M4)".
- **M2 Core rules merged (PR #13):** every rule in `src/logic/` with unit tests; `encounter.ts` is the glue the M4 scenes call (`startWildEncounter`, `finishBattle`).
- **Design complete. M0 Foundation merged (PR #3):** Phaser 4.2.1 + Vite 8 + TypeScript 6.0 skeleton that boots to a Title screen (New Game / Continue), seeded RNG (`src/logic/rng.ts`), `window.__TEST__` hook, ESLint/`tsc`/spelling/data checks, `npm run ci:local` (`--full` adds 3 Playwright smoke tests), pre-commit hook, one-job `ci.yml`. How-to: `docs/developer-guide.md`.
- **M1 Content as data merged (PR #7):** all content in `src/data/*.json` (31 monsters incl. Avatar, 45 moves, 10 abilities, 5 biomes, 5 items, `rules.json`, `guide.json`), Zod schemas in `schema.ts`, cross-checks in `validate.ts`, loaded for the game by `src/data/index.ts`. Proposed numbers (base stats, power tiers, effect amounts) in `02-Gameplay/Balance.md`.
- **M3 World merged (PR #9):** New Game → pick a biome → Ansonville hub (36x22 grid) with shop, Reviver and guide spots ("coming soon"), 5 biome gates (locked ones say "Map part needed") and the locked Avatar arena; 5 one-screen biome maps; arrow keys/WASD grid movement, camera, gate transitions. Maps are **character grids in `src/data/maps/index.ts`, not Tiled** (Decisions-Log). Step encounters on grass/sand/snow/ash fire `WILD_ENCOUNTER` on `game.events` (`src/scenes/events.ts`, payload `{ biomeId, sceneKey, tile }`) and show "A wild monster appears!"; the roll is `stepOnEncounterGround` in `src/logic/encounterRate.ts`. Scene keys: `Title`, `PickBiome`, `Ansonville`, `Forest`, `Beach`, `Desert`, `Snowy`, `Volcano` (one `MapScene` class). Minimal world state in `src/state/world.ts` (`openBiomes`, position, tips seen; `openBiome()` for M6) (folded into the game state in M4). Dev builds: **U** opens every gate. How-to: `docs/developer-guide.md` "The world (M3)".
- **Playable now (`npm run dev`):** New Game → pick a biome → catch your first monster → battle for XP and gems → M menu (team, bag, Monster Book, Ask Papai) → evolve (or press L in dev) → buy cages, potions or a map part at the shop → walk through the newly opened gate → heal at the Reviver → reload and Continue. Not yet: teleporting, the Avatar battle, the ending.
- **Art direction (PRs #10, #11):** **vector** placeholder art (not pixel); chosen palette (playful primaries, a theme per area) and approved looks for Ansonville, gates, arena, shop, Reviver and items; "N x Dumble" scales every dimension, battle sprites compressed (`clamp(72*sqrt(N), 56, 240)` px, OK'd 2026-11-22). Player (working look): a boy with shoulder-length blonde hair, light skin, blue eyes. Guide: **Papai**, a bald man with a dark mustache who explains the game when needed and points to quests and goals. All in `06-Art-and-Audio/Art-Mockups.html` and Art-Direction.md. PR #11 (round 2) is merged.
- **Owner's direction (2026-11-21):** get through M1–M4 as fast and efficiently as possible; fun and polish can wait. Build the simplest option where a design question is open, and ask the designer in parallel.
- **Laptop memory is tight** (it ran out once with Firefox open). Keep parallel sessions to what fits.
- **Merging:** owner's standing rule (ADR 0007, PR #2): merge only with `node scripts/merge-if-green.mjs <pr>` (`--docs-only` for docs PRs).
- TypeScript stays on 6.0 until typescript-eslint supports 7. Smoke tests run one at a time (parallel headless WebGL stalled on the laptop).
- Planning docs: `09-Production/Development-Plan.md` (milestones M0–M9), `docs/ci-standards.md`, ADRs 0001–0008, `01-Vision/Genre-Research.md`, filled-in Controls, UI, Tech, Audio and Characters docs.
- Skills: `design-buddy` (talking with the designer), `gameplay-expert` (rules and Papai's answers).

## Next
1. **Play-test M5/M6 with the designer** (catch, battle, evolve, shop, map part, Ask Papai) and capture his reactions as a new raw-input round (`00-Raw-Input/`, append only). Ask him (design-buddy) whether evolving should ask "Grow now?" and about Papai's personality (Open-Questions 38).
2. **M6b** (the m6b-m6c session failed; restart it): **after beating Avatar the game keeps going**, back in Ansonville to keep catching (designer, Round 63; Story-Outline.md, Decisions-Log). Also: level-50 teleport menu and pins (`world.ts` has `teleportSpots`/`placePin`/`removePin`), the Avatar battle (`startAvatarBattle` exists; `BattleScene` only starts wild battles today; the arena gate and Papai's goal say "coming soon"), ending and credits.
3. **M6c world polish (owner feedback):** bigger maps or more sections per biome, and a bigger Ansonville (Development-Plan M6c).
4. **M8 next:** ground tiles and the arena, the HUD icons, more sound effects (hit, buy, heal). Play the music for the designer: each biome's feel is his choice (Audio-Direction.md), and songs are easy to rewrite in `audio.json`.
5. **Saves:** autosave plus Continue, and a backup file (M menu → Save to file; Title → Load save file). Saves are per browser and per address (5173 dev vs 4173 preview). Tell the family to save a file now and then.
6. **Backlog:** dedicated catching scene (Development-Plan "Backlog", owner may want it).
7. Every feature PR: update Papai with the `gameplay-expert` skill (the coverage test will fail otherwise).

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
- **Owner:** confirm the section E defaults (C7, C8, X18, X19) when convenient; the final repo home and deploy host (ADR 0006).

## Folder map
See `README.md` and `CLAUDE.md` §1.
