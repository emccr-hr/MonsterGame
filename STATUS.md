# STATUS: Magic and Monsters

One line per session: date, what shipped, what's next. Newest at the top.
**PRs don't edit this file.** Each PR body carries a "STATUS line" section, and whoever merges adds the row (same rule as Pulse; parallel PRs kept conflicting on it).

| Date | What happened | Next |
|---|---|---|
| 2026-11-21 | M0 review leftovers (PR #5): pre-commit spell-checks staged files only; `guide.json` started with the title-screen tip. | M1: content as data. |
| 2026-11-21 | **M0 Foundation merged** (PR #3): Phaser 4.2.1 + Vite + TS skeleton (Title screen), seeded RNG, test hook, lint/spelling/data checks, `ci:local --full`, pre-commit hook, one-job CI, developer guide. | M1: content as data (Zod schemas + JSON from the design docs). |
| 2026-11-21 | Merge-on-green rule (ADR 0007, merge-if-green script; PR #2, merged by the owner). | M0 Foundation. |
| 2026-11-21 | **Development plan written** (`09-Production/Development-Plan.md`), genre research (`01-Vision/Genre-Research.md`), CI and testing standards (`docs/ci-standards.md`), first ADRs, the Design Buddy agent (`.claude/agents/design-buddy.md`), and the thin design docs filled in. | Milestone 0: project setup. |
| 2026-11-21 | **Design complete.** 61 rounds of the designer's input captured; 30 monsters in 15 families, 5 biomes, Ansonville, Avatar. Pushed to `emccr-hr/MonsterGame`. Folder moved to `Documents\MonsterGame` to keep it apart from Pulse. | Write the development plan. |
