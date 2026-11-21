# CLAUDE.md: Magic and Monsters

**Read `HANDOFF.md` first**, then the top of `STATUS.md`, then `09-Production/Development-Plan.md`.
This project is **separate from the Pulse app**. Don't bring Pulse's repos, data or processes in,
except the standards copied below.

## 0. House rules (adapted from Pulse)
1. **Archive, never delete**, unless a person explicitly says to. Superseded files go to `docs/archive/<topic>/` with a one-line README saying why.
2. **Model roles.** Opus plans, reviews, and solves the hard problems. Delegate sweeps, boilerplate, and well-specified mechanical work (data entry from monster docs, test scaffolding) to subagents on cheaper models. Verify their work before relying on it.
3. **Rules become scripts and hooks.** If a rule can be checked mechanically (spelling, data validity, no secrets), enforce it in `.githooks/pre-commit`, `npm run ci:local` or CI, not in memory.
4. **Never commit secrets.** `.env*` stays gitignored. There are no API keys in the browser game (ADR 0004).
5. **American English** everywhere: code, UI text, docs (`npm run lint:spelling`).
6. **CI costs minutes.** Draft PRs, `npm run ci:local` first, mark ready once, push once. Docs-only changes run no CI. See `docs/ci-standards.md`.
7. **Everything original** (Flags N1, N2). No names, creatures, items, maps, art, music or characters from existing games or shows.
8. **The designer is 10.** His words in `00-Raw-Input/` are the source of truth for *what* the game is. Never edit earlier rounds; only append. Ask before changing anything he decided. Exact numbers and engineering are ours to propose. When talking with him, use the `design-buddy` skill.

## 1. Where things are
| What | Where |
|---|---|
| Game design (rules, monsters, world) | numbered folders `01-`…`10-` |
| Development plan, milestones | `09-Production/Development-Plan.md` |
| Decisions: design | `09-Production/Decisions-Log.md` |
| Decisions: architecture (ADRs) | `docs/decisions/NNNN-title.md` |
| Problems found in the design | `09-Production/Flags.md` |
| Questions still open | `09-Production/Open-Questions.md` |
| Progress log | `STATUS.md` (one row per session; PRs don't edit it) |
| CI and testing rules | `docs/ci-standards.md` |
| Code | `src/` (layout in the Development Plan) |

## 2. Git workflow
- One branch per milestone task. Parallel sessions use **git worktrees beside the main clone** (`..\MonsterGame-<name>`), not under `.claude/worktrees/`, because on Windows some test runners skip dot-folders (a Pulse lesson).
- PRs to `main` only. Draft first. Run the `code-review` skill (or an equivalent review pass) before marking ready.
- PR body sections: **Summary**, **Testing** (`ci:local` result), **STATUS line**, **Screenshots** (for anything visible).
- **Merging (owner's standing rule, 2026-11-21, ADR 0007):** Claude may merge a PR when CI is green, **only** via `node scripts/merge-if-green.mjs <pr>`. The script checks the PR is open, ready, conflict-free and every check passed, and merges that exact commit. Docs-only PRs (no CI) are merged with `--docs-only` after review. Never use `gh pr merge` directly.
- Every code session ends with: `ci:local` green, a PR opened (draft or ready), and a STATUS line written.
- Run **one or two work sessions at a time** (laptop memory, usage limits).

## 3. Coding conventions
- **TypeScript**, strict mode. Phaser 4, Vite, Vitest, Playwright (ADR 0001).
- **Game rules in `src/logic/`**: plain TypeScript, no Phaser imports, deterministic with an injectable seeded random (ADR 0002). Scenes call logic; logic never calls scenes.
- **Content in `src/data/*.json`**, validated by Zod schemas (ADR 0003). Adding a monster never needs a code change.
- **Tests:** every logic module ships with Vitest tests. "Done well, fast," not "perfect."
- **Player-facing text:** short, kid-readable (about a 3rd–4th grade level), skippable.

## 4. Definition of Done (per milestone task)
1. Works in the browser build with keyboard (and mouse where it makes sense).
2. Logic covered by unit tests; `ci:local` green (`--full` if it touches a smoke-tested flow).
3. Behavior matches the design docs. If the code had to differ, update the doc and log it in Decisions-Log.
4. Any new player-facing feature has a line in the guide character's tips (`src/data/guide.json`).
5. STATUS line in the PR body.

## 5. Decisions (ADRs)
One file per architectural decision in `docs/decisions/` (`0001-...md`): what was decided, why, and what was ruled out.
Check the number isn't taken before filing (`ls docs/decisions`). Don't relitigate a settled ADR
without a new one that supersedes it.
