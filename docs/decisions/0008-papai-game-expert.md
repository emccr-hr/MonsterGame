# 0008: Papai is the game expert, from a scripted knowledge file with a coverage check

**Decided 2026-11-22** (owner: "Papai is the guide for the whole game and must be the game expert").

## What
- **In the game**, Papai answers from `src/data/guide.json`, checked by Zod (`src/data/schema.ts`):
  - `tips`: first-time tips, shown once per screen.
  - `topics`: questions and short answers ("How do I catch a monster?"). Each lists what it `covers`
    (`scene:<SceneKey>`, `key:<KEY>`, `item:<itemId>`, `rule:<name>`). A topic can stay hidden until a
    condition holds (`unlock`, e.g. teleporting from level 50).
  - `goals`: "What should I do next?" Papai gives the first goal whose `when` condition holds for the
    current game. Conditions are a fixed list, evaluated in `src/logic/guide.ts` (unit-tested).
  - Players reach him at his spot in Ansonville or with **M → Ask Papai** anywhere (`PapaiScene`).
- **A coverage check** (`tests/unit/data/guideCoverage.test.ts`) reads the scene code and fails when a
  screen (`super('Name')`), a key binding or an item in `items.json` has no topic that covers it. So a
  new screen, control or item can't ship without Papai knowing about it (CLAUDE.md DoD item 4).
- **At development time**, the **gameplay-expert** skill (`.claude/skills/gameplay-expert/SKILL.md`)
  keeps `guide.json` true to the rules: it reads the design docs and `src/logic/`, answers developers'
  "how does X work?", and updates topics and goals whenever a feature changes.

## Why
- ADR 0004 still holds: no live AI or API keys in the browser game. Scripted answers are free,
  instant, kid-safe, testable and work offline.
- The coverage check turns "Papai must know everything" into a rule a script enforces (CLAUDE.md §0.3).
- Conditions as a fixed list (not free-form expressions in JSON) keep the data simple for anyone
  adding a topic, and every condition is tested.

## Ruled out
- Live AI chat with Papai (ADR 0004; would need a backend, filtering and cost controls).
- Hand-written hints inside scene code: they drift from the rules and can't be checked.
- A separate "controls registry" that every scene must use: more refactoring than the source scan,
  for the same protection.
