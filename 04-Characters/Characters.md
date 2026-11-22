# Characters

## Player character
- **Working look (owner, 2026-11-21, to define further):** a **boy with shoulder-length blonde hair, light skin and blue eyes**. Outfit not decided (see the mockup in `06-Art-and-Audio/Art-Mockups.html`).
- **To decide (designer):** whether players pick from a few looks and type their own name.
- Proposed: pick from 3–4 original looks, type a name (letters only, max 10).

## The guide character (in-game helper)
*Plan: ADR 0004 and Development Plan M7.*
- **Look (owner, 2026-11-21):** a **bald man with a dark mustache**. Name, outfit and personality are still open.
- **Job (owner, 2026-11-21):** explains the game **when needed** and gives **direction about quests and goals**.
- Lives in **Ansonville**, next to the Reviver.
- **"What should I do next?"** Scripted from game state: first catch → explore → buy a map part → evolve → catch them all → the Avatar gate.
- **"How does ___ work?"** A short glossary: cages, Big Monsters, Burn, Freeze, Dig, Fetch, evolving, map parts, teleporting, the Avatar gate.
- **Cheers you on** after a loss ("Your monsters are all healed. Let's try again!").
- Can also appear as a pop-up for first-time tips (shown once each).
- Scripted, not live AI, in v1: safe, free, works offline.

## The Design Buddy (for building the game, not in it)
The `design-buddy` skill (`.claude/skills/design-buddy/SKILL.md`) is the Claude helper the designer
talks to while the game is being made. It answers "how does ___ work?" from these docs, suggests
options, records his words and decisions, and flags problems. Start a Claude Code session in this folder and say:
"Use the design buddy, I have an idea for a monster."

## Monsters and the boss
See `Monster-List.md`, `Monsters/`, and `Final-Boss.md`.
