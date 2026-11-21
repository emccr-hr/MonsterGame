# 0005: Lean CI: one job, local-first testing

**Decided 2026-11-21** (owner: "CI testing where we can, but less than Pulse").
One GitHub Actions job (lint, types, spelling, data validation, unit tests, build), with a target under 3 minutes. Runs on ready PRs and pushes to `main`; drafts and docs-only changes run nothing. Playwright smoke tests run locally (`npm run ci:local -- --full`) and in CI only by manual dispatch. Details in `docs/ci-standards.md`.
**Ruled out:** Pulse-style multi-job CI with E2E on every PR (ran out of minutes).
