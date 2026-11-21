# 0007: Claude merges PRs when CI is green, through a checking script

**Decided 2026-11-21 by the owner** ("you can do the merges if we're green on CI").
- Merges go through `node scripts/merge-if-green.mjs <pr>`, the only merge command allowed in `.claude/settings.json`. It refuses unless the PR is open, targets `main`, isn't a draft, has no conflicts, and every CI check finished as success, skipped or neutral (at least one success). It merges the exact head commit it checked (`--match-head-commit`).
- **Docs-only PRs** run no CI (ADR 0005). After review, merge them with `--docs-only`; the script verifies every changed file is a docs path and that the PR has no checks.
- **Ruled out:** a blanket `gh pr merge` permission (it can't check that CI is green), and asking the owner for every merge (slow; same as Pulse's standing merge-on-green rule).
- Still ask the owner first for: red or flaky checks, security-sensitive changes, anything that changes this rule.
