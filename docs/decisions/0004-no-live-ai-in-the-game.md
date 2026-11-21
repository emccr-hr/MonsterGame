# 0004: The in-game guide character is scripted; no live AI in v1

**Decided 2026-11-21.**
The guide character in Ansonville (name and look up to the designer) gives tips, explains rules and points to the next goal, using **scripted, state-aware hints** from `src/data/guide.json`.
**Why:**
- A browser game can't hold an API key safely.
- Live AI chat with a child needs a backend, content filtering, logging and cost controls.
- Scripted hints are free, instant, testable and work offline.

**Design help with live AI happens at development time instead:** the `design-buddy` skill (a Claude Code skill) is how the designer asks questions and gets suggestions.
**Later (not v1):** if a live AI guide is wanted, it needs a small backend proxy, a kid-safe system prompt versioned in the repo, Zod-validated output, logging, a spend cap and a parent toggle (same pattern as Pulse's AI module). That would need a new ADR.
