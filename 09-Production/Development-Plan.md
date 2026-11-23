# Development Plan: Magic and Monsters

*Written 2026-11-21. The design is complete (see `HANDOFF.md`). This is how we build it. Standards:
`CLAUDE.md`, `docs/ci-standards.md`, `docs/decisions/`.*

## 1. Goals and guardrails
- **Build everything at once** (Round 61): Ansonville, 5 biomes, 30 monsters, Avatar. Milestones below are a **build order**, not separate releases. Each one ends with a playable local build the designer can try.
- **Simple and fun for a 10-year-old.** Short text, a clear next goal, no punishment for losing, no twitch reflexes (`01-Vision/Genre-Research.md`).
- **The designer drives themes and choices.** We propose numbers and engineering. When the build needs a design answer, ask through the `design-buddy` skill and record it. Don't guess on anything he'd care about.
- **Original content only** (Flags N1, N2).
- **Cheap CI** (ADR 0005): test locally, one short CI job.

## 2. Tech stack (ADR 0001)
Phaser 4 (pin the exact latest stable at setup), TypeScript strict, Vite, Tiled (JSON maps), Zod, Vitest,
Playwright, ESLint. Node LTS. Saves in `localStorage`, plus an export/import save file.

## 3. Repository layout
```
/00-…/10-          design docs (unchanged; the source for data files)
/docs              ci-standards.md, decisions/ (ADRs), developer-guide.md, archive/
/src
  /logic           pure rules: rng, stats, battle, status, catch, xp, evolve, spawn, economy, gate, teleport, save
  /data            monsters.json, moves.json, abilities.json, biomes.json, items.json, guide.json, schema.ts
  /scenes          Boot, Title, Ansonville, Biome, Battle, Catch, Team, Backpack, MonsterBook, Shop, Map, Evolve, Avatar, Ending
  /ui              shared widgets: dialog box, menu, HP bar, buttons, next-goal arrow, toast
  /state           game-state store and save/load glue (calls logic/save)
  main.ts
/public/assets     sprites/, tiles/, maps/ (Tiled JSON), audio/
/tests             unit/ (Vitest, mirrors src/logic), smoke/ (Playwright)
/scripts           ci-local.mjs, validate-data.mjs, check-us-spelling.mjs, docs-to-data.mjs
/.githooks         pre-commit
/.github/workflows ci.yml, deploy.yml (tags only)
```

## 4. Milestones (build order)
Each milestone ends with: `ci:local` green, PRs merged, a STATUS row, and a **play-test build** for the designer.

### M0: Foundation
- Vite + TS + Phaser skeleton; Boot and Title scenes ("Magic and Monsters", New Game / Continue).
- ESLint, `tsc`, Vitest, Playwright installed; `npm run ci:local` (with `--full`) per `docs/ci-standards.md`.
- `scripts/check-us-spelling.mjs` (port the Pulse word list), `.githooks/pre-commit`, `ci.yml` (one job), `.gitignore`.
- Seeded RNG (`src/logic/rng.ts`) and the test hook `window.__TEST__` (ready flag plus read-only state) for smoke tests.
- `docs/developer-guide.md`: setup, scripts, folder map, how to add a monster.
- **Exit:** blank game boots in the browser; CI green in under 3 minutes.

### M1: Content as data
- Zod schemas for monsters, moves, abilities (effect kinds, ADR 0003), biomes, items, guide hints.
- **Convert the design docs to JSON** (30 monsters, every move in `02-Gameplay/Move-List.md`, the abilities, 5 biomes with spawn weights, shop items and prices, Avatar). Delegate to a subagent on a cheaper model, then **verify against the docs** (counts, names, levels, spawn weights).
- `npm run validate:data` with cross-checks.
- Propose base stats (HP, Attack, Defense, Speed) per monster from size and role, written in a table in `02-Gameplay/Balance.md` for the parent to skim.
- **Exit:** `validate:data` green, and a printed monster list matches `Monster-List.md`.

### M2: Core rules (no graphics)
All in `src/logic/`, all unit-tested:
- Stats by level; damage formula (power × attack/defense × level factor, small random spread); turn order (speed; **Quick** first).
- Abilities: Lava Skin, Not at this restaurant, Cute, Colony Bond, Fur Coat, Quick, Wise, Slippery, Snack Thief, Water Storage.
- Statuses: **Burned** (2 turns), **Frozen** (skip 1 turn, 25%); Fur Coat immunity; Reviver clears.
- Special moves: Dig (2-turn, untargetable), Fetch (+20%, stacks ×2, resets), Sleep (heal, skip next), Protect the Queen (team heal), Eat (heal half the damage dealt), Spit, Slobber and Screech (weaken next attack), Popsicle.
- Switching (costs a turn); lose when all 6 are knocked out.
- Catching: the formula in Mechanics (30% + 60% × missing HP, cap 95%, Big ×0.8); can't catch a knocked-out monster; runs away after 3 failed throws.
- XP and leveling to 100 (curve: level 50 ≈ after exploring all 5 biomes); evolution with move swaps.
- Spawning: weights per biome, Big roll 1/100, wild level scales with the team (X18).
- Economy: Magic Gems, prices, starting 100 cages + 100 gems (C8), map parts (50, one per locked biome).
- Center gate: one of every wild base monster caught. Teleport at 50+ (shops + 5 pins, deleted pins return).
- Save/load with a version number and a migration hook.
- **Exit:** about 150+ fast unit tests, all green.

### M3: World
- Tiled maps: **Ansonville** (center hub: shop, Reviver, guide character, 5 biome gates, Avatar arena gate) and **5 small biomes** (each one screen or a little more, with a shop and Reviver near the entrance).
- Player movement (arrow keys/WASD), collisions, camera, scene transitions.
- New game: pick the first biome (the other 4 gates show a lock and "Map part needed").
- **Visible wild monsters** wandering in spawn zones if the designer picks it (Open-Questions F); otherwise step-based encounters in grass, snow, sand and so on.
- **Exit:** walk Ansonville and the starting biome, then buy a map part and enter another.

### M4: Catching and battles
- Catch scene: throw the tiny cage, which grows big in the air, wobbles 1–3 times, then catches or breaks free. Optional timing circle if picked (F4).
- Battle scene: two monsters, HP bars, 4-move menu, Switch / Cage / Bag / Run, short battle text, **speed-up toggle** (2×), animations skippable.
- First catch with no team: the wild encounter offers only "Throw cage" (Round 61).
- **Exit:** catch, battle, win XP, faint and wake at the Reviver.

### M5: Team, Backpack, Monster Book, Evolution
- Team (6) and Backpack (unlimited) screens with swapping; Monster Book (seen/caught, Big star, biome); evolution scene.
- **Exit:** catch 7+, swap teams, evolve one, and the Monster Book shows progress toward the Avatar gate.

### M6: Shops, map parts, teleport, Avatar, ending
- Shop UI (cages, Potion, Wake-Up Snack, map parts, teleport pins); Revivers.
- Level 50 unlock: teleport menu (shops and pins; place, delete and return pins; max 5).
- Avatar arena gate counter ("Monsters caught: 12 / 15"); Avatar fight (5 moves, no ability, can't be caught); ending scene and credits ("Designed by …", with the name the parent chooses to show).
- **Exit:** full game playable start to finish (with fast-XP debug cheats behind a dev flag).
- **Status (2026-11-22):** shop, map parts, gem/cage HUD and the arena counter are built (M6a). Left for **M6b:** teleport menu and pins, the Avatar battle, the ending and credits. **Bigger biome maps started (Round 65):** 38 wide with 8 grass patches; Beach palms and coconuts. **After the credits the game keeps going** (back in Ansonville, keep catching; designer, Round 63). Dev builds already have the L key (fast leveling).

### M6c: World polish (owner feedback, 2026-11-22)
- **Bigger maps or more sections:** each biome grows past one screen (larger grids, or 2–3 connected sections with exits between them), with more encounter ground, trees and water to explore; Ansonville grows to match. Maps stay character grids in `src/data/maps/index.ts` (each section its own map, joined by exits), so `tests/unit/world/maps.test.ts` keeps checking them.
- Keep the shop and Reviver near each biome's entrance; layouts that change what the designer decided go to him first (design-buddy).
- **Exit:** every biome takes a few minutes to explore; smoke tests still walk in and out.

### M7: Guide character and onboarding
- Guide character in Ansonville (name and look from the designer). Scripted hints (ADR 0004):
  - "What should I do next?", answered from game state (e.g., "Catch your first monster! Walk into the tall grass in the Forest.").
  - "How does ___ work?", a short glossary (cages, Big Monsters, Burn, Freeze, evolving, map parts, teleporting, the Avatar gate).
  - Encouragement after a loss.
- **Next-goal arrow** on screen (can be turned off). First-time tips for each new screen, shown once.
- **Exit:** a new player reaches their first evolution without help from a grown-up.

### M8: Art and audio
- **Base character art first** (Round 61): the 15 base-form monsters and the player character, as original sprites drawn from the monster docs (**vector**, owner's pick 2026-11-21), sized to the size rules (Dumble = 1×).
- **Placeholders** for evolved forms, Avatar, tiles and items: colored shapes with the name and an icon, the same size as the final art.
- **Designer drawings pipeline:** scan or photograph → clean up → sprite sheet; a drawing replaces the placeholder whenever it arrives (`06-Art-and-Audio/Art-Direction.md`).
- Audio: royalty-free or original music per biome, plus sound effects (cage throw, catch, level up, evolve). Volume and mute settings.
- **Exit:** no missing-art errors; every monster shows something.
- **First version built (2026-11-22):** vector sprites for all 31 monsters, the player and Papai (`src/assets/sprites/`, Art-Direction.md "Vector sprites (M8)"), with the look-data drawing as the fallback. **Round 2:** item pictures, map buildings, gates and trees; original music per area and sound effects with a Sound setting (`src/data/audio.json`); the designer's drawings how-to (`06-Art-and-Audio/Designer-Drawings-How-To.md`). Still to do: ground tiles and the arena, more sound effects (hit, buy, heal), the owner's OK on the evolved forms.

### M9: Tuning, play-test, release
- Designer play-tests every milestone build. The final round focuses on: too hard or too easy? where did you get stuck? what's boring?
- Tune XP, prices, catch rates and spawn weights; fix bugs; check performance on the family computer.
- Accessibility pass: keyboard only, text speed, nothing relies on color alone.
- Release: tag `v1.0.0` → `deploy.yml` (ADR 0006).

### Backlog (enhancements, not scheduled in a milestone yet)
- **Dedicated catching scene (owner, 2026-11-22).** Today the Cage action plays the throw inside the battle. Proposal: when you pick Cage (or meet a wild monster with no team), cut to a short full-screen catching scene: the wild monster in the middle, the player's hand at the bottom, the tiny cage flies, grows big around the monster, wobbles 1–3 times, then a "Caught!" card with the monster's picture and "Team" or "Backpack", or it breaks open and you go back to the battle. Same rules (`src/logic/catching.ts`), only a new scene (`CatchScene`) that `BattleScene` runs and waits for. About half a day. Build after M5 and M6 if small; could pair with throw timing (Open-Questions 33) if the designer wants that.

## 5. How sessions run (Pulse-style, lighter)
- **One orchestrator session** keeps `HANDOFF.md` and `STATUS.md` current, writes briefs, reviews PRs, and merges (docs-only after review; code when CI is green).
- **One or two work sessions at a time**, each in its own worktree beside the main clone, each with a brief naming files, exit criteria and "read HANDOFF.md first". Keep writers off the same files. Suggested split: logic in one session, scenes and UI in another, once M2's interfaces exist.
- **Subagents on cheaper models** for data entry (M1), test scaffolding, sprite batch generation, and sweeps. Opus reviews.
- **Verify, don't trust:** check the PR and run `ci:local` before saying something is done.

## 6. Design questions that will come up during the build
Ask the designer (with `design-buddy`), then record the answers:
- **Open-Questions section F** (ideas from the research): visible wild monsters, catch streaks, partner follows you, throw timing, Monster Book, speed-up, optional tough trainers.
- The **player character**: look, and whether the player can pick from a few looks or type a name.
- The **guide character**: name, look, personality.
- Music feel for each biome.
- Section E defaults (C7, C8, X18, X19), whenever he's around.

## 7. Risks
| Risk | Plan |
|---|---|
| 30 monsters of art is a lot | Base forms first, placeholders, designer drawings over time |
| Level 100 and the 45-level evolutions feel grindy | Shared team XP, scaling, tuning in M9, debug XP for testing |
| Battles get slow | Speed-up and skip from M4 |
| Scope creep from new ideas | New ideas go to the Ideas Parking Lot during the build; the designer picks which, after v1 |
| CI minutes | ADR 0005; local first |
| Repo move to the other account | Plain git history; deploy host per ADR 0006 |
