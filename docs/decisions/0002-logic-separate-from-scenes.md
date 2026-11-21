# 0002: Game rules live in `src/logic/`, separate from Phaser scenes

**Decided 2026-11-21.**
All rules (damage, turn order, catching, statuses, XP and leveling, evolution, spawning, economy, gates, save data) are plain TypeScript in `src/logic/` with **no Phaser imports**. Random numbers come from an injected seeded RNG.
**Why:** fast, deterministic Vitest tests that run locally in seconds, which keeps CI short and cheap (docs/ci-standards.md). Scenes stay thin: they draw, read input, and call logic.
**Ruled out:** rules inside scene classes (hard to test; needs a browser).
