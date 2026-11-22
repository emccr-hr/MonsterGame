# STATUS: Magic and Monsters

One line per session: date, what shipped, what's next. Newest at the top.
**PRs don't edit this file.** Each PR body carries a "STATUS line" section, and whoever merges adds the row (same rule as Pulse; parallel PRs kept conflicting on it).

| Date | What happened | Next |
|---|---|---|
| 2026-11-22 | **M4 Catching and battles merged** (PR #15): Battle scene on M2 rules (first catch is cage-only, cage throw animation, 2x speed), Reviver heals and is the wake-up spot after a loss, game saves to the browser and Continue works; vector placeholders; battle smoke test. | Play-test with the designer; M5 team, backpack, Monster Book, evolution. |
| 2026-11-22 | **M2 Core rules merged** (PR #13): battle engine, catching, XP and evolution, spawning, economy, teleport, and save/load in `src/logic/` with 288 unit tests; Avatar stats tuned. | M4 catching and battles. |
| 2026-11-21 | **M1 Content as data merged** (PR #7): Zod schemas and cross-checks, 31 monsters, 45 moves, 10 abilities, 5 biomes, items and rules as JSON; base stats proposed in `02-Gameplay/Balance.md`. | M2 core rules and M3 world. |
| 2026-11-21 | M0 review leftovers (PR #5): pre-commit spell-checks staged files only; `guide.json` started with the title-screen tip. | M1: content as data. |
| 2026-11-21 | **M0 Foundation merged** (PR #3): Phaser 4.2.1 + Vite + TS skeleton (Title screen), seeded RNG, test hook, lint/spelling/data checks, `ci:local --full`, pre-commit hook, one-job CI, developer guide. | M1: content as data (Zod schemas + JSON from the design docs). |
| 2026-11-21 | Merge-on-green rule (ADR 0007, merge-if-green script; PR #2, merged by the owner). | M0 Foundation. |
| 2026-11-21 | **Development plan written** (`09-Production/Development-Plan.md`), genre research (`01-Vision/Genre-Research.md`), CI and testing standards (`docs/ci-standards.md`), first ADRs, the Design Buddy agent (`.claude/agents/design-buddy.md`), and the thin design docs filled in. | Milestone 0: project setup. |
| 2026-11-21 | **Design complete.** 61 rounds of the designer's input captured; 30 monsters in 15 families, 5 biomes, Ansonville, Avatar. Pushed to `emccr-hr/MonsterGame`. Folder moved to `Documents\MonsterGame` to keep it apart from Pulse. | Write the development plan. |
