# CI and testing standards

Adapted from the Pulse project's CI rules (where GitHub Actions minutes ran out), made **lighter**
on purpose. **Test locally first. GitHub CI is a final check, not the place to find bugs.**

## Why
- GitHub bills Actions per job, rounded **up to a whole minute**. Many small jobs cost more than one
  bigger job.
- Public repos get free standard runners, but this repo may move to a **private** repo later, where
  minutes are limited (2,000/month on the free plan). Build the habits now.
- Target: **one CI job, under 3 minutes, about once per PR plus once on merge.**

## Local first: `npm run ci:local`
One command runs everything CI runs, on this machine:
1. `npm run lint`: ESLint and TypeScript type check (`tsc --noEmit`).
2. `npm run lint:spelling`: American English spelling (same rule as Pulse).
3. `npm run validate:data`: every monster, move, ability, biome and shop JSON file checked against its schema, plus cross-checks (every move a monster lists exists, evolve levels are within 1–100, every biome has at least one wild monster, and so on).
4. `npm test`: Vitest unit tests for game logic (battle math, catching, XP and leveling, evolution, spawning, economy, save/load).
5. `npm run build`: the production build must succeed.

`npm run ci:local -- --full` adds:

6. `npm run e2e`: a **small** Playwright smoke suite (about 5 tests) against the built game in headless Chromium: game loads, new game, pick a biome, catch a monster, win a battle, save and reload.

Run `ci:local` before marking any PR ready. Run `--full` when a PR changes scenes, UI, save data, or
anything the smoke suite covers.

## What GitHub CI runs
One workflow, **one job** (`.github/workflows/ci.yml`):

| Trigger | Runs? |
|---|---|
| Draft PR | **No** |
| PR marked ready, or new push to a ready PR | Yes: steps 1–5 above |
| Docs-only change (`*.md`, `docs/**`, the numbered design folders) | **No** (paths-ignore) |
| Push to `main` | Yes: steps 1–5 |
| Manual run (`workflow_dispatch`) | Yes: steps 1–5, plus E2E if the `full` input is checked |

- **E2E (Playwright) does not run in CI by default.** Browsers are slow to install and use the most
  minutes. It runs locally with `ci:local -- --full`; put the result in the PR body.
- `concurrency` cancels an older run on the same branch when a new push arrives.
- Cache npm with `actions/setup-node`'s built-in cache. `timeout-minutes: 10`.

## Rules for sessions
1. **Open PRs as drafts.** Drafts run no CI. Push as often as you like.
2. **Run `npm run ci:local`** (add `-- --full` when relevant) before marking ready.
3. **Mark ready once** (`gh pr ready`). That starts the one PR run.
4. **Push once after marking ready**, not commit by commit.
5. **Docs-only changes run no CI.** Still run `npm run lint:spelling` locally.
6. **Don't re-run CI just to check again.** Re-run only for a real flake, and say so in the PR.
7. Put the `ci:local` result (pass counts) in the PR body under **Testing**.

## Pre-commit hook (`.githooks/pre-commit`)
Enable once per clone: `git config core.hooksPath .githooks`.
- Spelling check.
- Blocks staged `.env` files and anything that looks like an API key.
- Runs `validate:data` when JSON under `src/data/` is staged (fast, catches typos in new monsters).

## Testing pyramid for this game
| Layer | Tool | What | Where it runs |
|---|---|---|---|
| Data validation | Zod schemas + `validate:data` | Every content file is well-formed and cross-references resolve | pre-commit, local, CI |
| Unit | Vitest | Pure game logic in `src/logic/` (no Phaser imports), so tests are fast and deterministic (seeded random) | local, CI |
| Smoke | Playwright | 5 or so end-to-end flows in a real browser | local (`--full`); CI only on manual dispatch |
| Play-test | People | The designer plays each milestone build and says what's fun or broken | at home |

**Rule:** game rules live in `src/logic/` as plain TypeScript with no Phaser imports. Scenes call
logic; logic never calls scenes. That is what keeps most testing fast, local, and cheap.
