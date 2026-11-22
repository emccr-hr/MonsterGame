# STATUS: Magic and Monsters

One line per session: date, what shipped, what's next. Newest at the top.
**PRs don't edit this file.** Each PR body carries a "STATUS line" section, and whoever merges adds the row (same rule as Pulse; parallel PRs kept conflicting on it).

| Date | What happened | Next |
|---|---|---|
| 2026-11-22 | **M8 round 2** (PR #28): item pictures (Shop, Bag, cage throw), map buildings, gates and a tree per area; original synthesized music per area (plus an Avatar battle song) and sound effects, with a Sound setting in the M menu; the designer's drawings how-to. | Listen to the music with the designer; M6b; M6c bigger maps; M8 ground tiles, arena, more sound effects. |
| 2026-11-22 | **Vector art, first version (M8)** (PR #26): SVG sprites for all 31 monsters (approved mockup drawings for the base forms, Avatar, the player and Papai; new drawings for the evolved forms, approved by the owner), shown in battle, menus, the Monster Book and on the map; look-data fallback; sprite gallery dev page. | M8 round 2 (items, map art, audio); play-test; M6b; M6c bigger maps. |
| 2026-11-22 | **Save file backup** (PR #24): Save to file (M menu) and Load save file (Title); bigger maps scheduled as M6c; owner feedback on maps and vector art recorded. | Play-test; M6b teleport, Avatar battle, ending; M6c bigger maps. |
| 2026-11-22 | **A look for each monster** (PR #22): body, accent and markings per monster from `monsters.json` (Snowy whites, spots, a penguin tux...), drawn everywhere; brighter Desert, Snowy and Volcano map colors. | Play-test M5/M6 with the designer; M6b teleport, Avatar battle, ending. |
| 2026-11-22 | **Papai is the game expert** (PR #21): Ask Papai at his spot or from the M menu, "What should I do next?" from the game state, 20 scripted questions and answers, a test that every screen, key and item has an answer, and the `gameplay-expert` skill (ADR 0008). | Per-monster looks and map palette; M6b teleport, Avatar battle, ending. |
| 2026-11-22 | **M6a merged** (PR #20): shop with items and map parts (buying one opens the gate), gems and cages on the map, Avatar arena counter. | Papai; M6b. |
| 2026-11-22 | **M5 merged** (PR #19): M menu with Team and Backpack (swap, sort), Bag with target picker (also in battle), Monster Book (seen, caught, Big, Avatar gate counter), evolution scene after battles; dev L key to reach evolving. | M6 shop and map parts. |
| 2026-11-22 | Owner decisions recorded (PR #18): battle size rule OK, a look per monster from data, catching scene in the backlog, Papai as the game expert; monster drawing moved to `src/ui/monsterArt.ts`. | M5. |
| 2026-11-22 | Red ant standoff hint (PR #17): when two red ants can't hurt each other, the battle text says to switch or run. | M5 team, backpack, Monster Book, evolution. |
| 2026-11-22 | **M4 Catching and battles merged** (PR #15): Battle scene on M2 rules (first catch is cage-only, cage throw animation, 2x speed), Reviver heals and is the wake-up spot after a loss, game saves to the browser and Continue works; vector placeholders; battle smoke test. | Play-test with the designer; M5 team, backpack, Monster Book, evolution. |
| 2026-11-22 | **M2 Core rules merged** (PR #13): battle engine, catching, XP and evolution, spawning, economy, teleport, and save/load in `src/logic/` with 288 unit tests; Avatar stats tuned. | M4 catching and battles. |
| 2026-11-21 | **M1 Content as data merged** (PR #7): Zod schemas and cross-checks, 31 monsters, 45 moves, 10 abilities, 5 biomes, items and rules as JSON; base stats proposed in `02-Gameplay/Balance.md`. | M2 core rules and M3 world. |
| 2026-11-21 | M0 review leftovers (PR #5): pre-commit spell-checks staged files only; `guide.json` started with the title-screen tip. | M1: content as data. |
| 2026-11-21 | **M0 Foundation merged** (PR #3): Phaser 4.2.1 + Vite + TS skeleton (Title screen), seeded RNG, test hook, lint/spelling/data checks, `ci:local --full`, pre-commit hook, one-job CI, developer guide. | M1: content as data (Zod schemas + JSON from the design docs). |
| 2026-11-21 | Merge-on-green rule (ADR 0007, merge-if-green script; PR #2, merged by the owner). | M0 Foundation. |
| 2026-11-21 | **Development plan written** (`09-Production/Development-Plan.md`), genre research (`01-Vision/Genre-Research.md`), CI and testing standards (`docs/ci-standards.md`), first ADRs, the Design Buddy agent (`.claude/agents/design-buddy.md`), and the thin design docs filled in. | Milestone 0: project setup. |
| 2026-11-21 | **Design complete.** 61 rounds of the designer's input captured; 30 monsters in 15 families, 5 biomes, Ansonville, Avatar. Pushed to `emccr-hr/MonsterGame`. Folder moved to `Documents\MonsterGame` to keep it apart from Pulse. | Write the development plan. |
