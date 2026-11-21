# Handoff: Magic and Monsters

**Read this first in any new session**, then `CLAUDE.md` §0 (house rules), the top of `STATUS.md`,
and `09-Production/Development-Plan.md`. Whoever orchestrates keeps this file current: update
**State**, **Next**, and **Waiting on** whenever something lands.

## Context
- **Magic and Monsters** is a monster-catching browser game **designed by a 10-year-old**, with his parent (the owner, GitHub `emccr-hr`) helping. Separate from the owner's Pulse work.
- Goal: a **simple, fun** game that matches his vision. He drives themes and choices. We suggest numbers and engineering, and ask when it matters.
- His exact words: `00-Raw-Input/Kid-Description.md` (61 rounds; voice-typing slips are noted under each round).
- Repo: https://github.com/emccr-hr/MonsterGame (public, `main`). It may later move to another account the owner controls.

## State (2026-11-21)
- **Design complete. Development plan written. No code yet.**
- Planning docs: `09-Production/Development-Plan.md` (milestones M0–M9), `docs/ci-standards.md`, ADRs 0001–0006, `01-Vision/Genre-Research.md`, filled-in Controls, UI, Tech, Audio and Characters docs.
- The `design-buddy` skill exists for talking with the designer.

## Next
1. **M0 Foundation** (Development Plan §4): Vite + TS + Phaser 4 skeleton, lint and type check, spelling lint, Vitest, Playwright, `ci:local`, pre-commit hook, one-job `ci.yml`, seeded RNG, test hook, developer guide.
2. **M1 Content as data**: Zod schemas plus JSON converted from the design docs (subagent on a cheaper model, then verify).
3. **M2 Core rules** in `src/logic/` with unit tests.
From M2 on, two work sessions can run in parallel (logic and scenes), each in its own worktree beside the clone.

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
- **Designer (via design-buddy):** Open-Questions sections **F** (research ideas: visible wild monsters, catch streaks, partner, throw timing, tough trainers) and **G** (player character, guide character). Needed by M3–M7, not M0–M2.
- **Owner:** confirm the section E defaults (C7, C8, X18, X19) when convenient; the final repo home and deploy host (ADR 0006).

## Folder map
See `README.md` and `CLAUDE.md` §1.
