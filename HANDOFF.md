# Handoff: for the Claude picking up development

## Context
- **Magic and Monsters** is a monster-catching browser game designed by a 10-year-old, with a parent helping.
- Goal: a **simple** game that matches his vision. When unsure, pick the smaller version.
- His exact words are in `00-Raw-Input/Kid-Description.md` (61 rounds). That is the source of truth for intent. Voice typing caused many name slips; the notes under each round say how they were read.
- Open issues and agreed simplifications: `09-Production/Flags.md`. Decisions: `09-Production/Decisions-Log.md`. Remaining questions: `09-Production/Open-Questions.md` (only section E is left, and every item has a default you can build with).

## Current status (2026-11-21)
**Design complete. No code yet.** Ready to build.

## Hard rules
- **Original content only.** He named an existing monster-catching game as inspiration. Never use its names, creatures, items, map, music or art (Flags N1). Avatar must have an original look, with nothing from any TV show of a similar name (Flags N2).
- **Data-driven monsters.** The designer will keep adding monsters. Adding one should mean adding a data row, not changing code (Mechanics → "Adding unlimited monsters").
- **Scope:** build **everything at once** (all 5 biomes, 30 monsters, Avatar). No reduced first version.

## The game in one screen
| Area | What's decided | Where |
|---|---|---|
| Platform | Browser on a computer, keyboard, 2D top-down | 08-Tech/Tech-Notes.md |
| Start | Ansonville (center of map), **no starter monster**, **100 cages** + 100 Magic Gems; pick 1 biome to open | 02-Gameplay/Mechanics.md |
| World | 5 biomes (Forest, Beach, Desert, Snowy, Volcano) around Ansonville; others open by **buying their map part** | 03-World-and-Story/Setting.md |
| Catching | Throw a cage right away or battle first; lower HP = better chance; tiny cage grows big when thrown | Mechanics.md |
| Battles | Turn-based 1v1, 4 moves max, 1 ability, no types; element tags on moves; only statuses are Burned and Frozen | Mechanics.md, Move-List.md |
| Team | 6 at the ready, unlimited backpack; swap outside battle, or mid-battle at the cost of a turn | Mechanics.md |
| Growth | XP from battles, max level 100, each monster evolves at its own level (15–45); 2 forms per family | Monster-List.md |
| Monsters | **30 monsters, 15 families, 3 wild per biome**, spawn weights; Big Monster = 1 in 100, 1.5x size | 04-Characters/ |
| Economy | Magic Gems; shops in Ansonville + every biome; Cage 10, Potion 15, Wake-Up Snack 30, Map part 50, Teleport pin 100 | Progression-and-Economy.md |
| Healing | Free **Reviver** next to every shop; losing sends you to the last one used | Mechanics.md |
| Level 50 | Teleport to any shop, plus up to 5 placeable teleport pins | Mechanics.md |
| Ending | Catch one of every wild monster → Avatar arena in Ansonville opens → beat **Avatar** (5 element moves, no ability, not catchable, 10x Dumble) | 04-Characters/Final-Boss.md |
| Art | Base character art first (15 base monsters + player), placeholders elsewhere, the designer's drawings swapped in later | 06-Art-and-Audio/Art-Direction.md |

## Suggested build order
1. **Project setup:** browser game (e.g., Phaser 3 or plain HTML5 canvas), with a simple local dev server and save to browser storage.
2. **Data files:** monsters, moves, abilities, biomes and shop items as JSON, built from `04-Characters/` and `02-Gameplay/Move-List.md`.
3. **Map:** Ansonville hub + 5 biome areas (small), biome gates, map-part unlocks, first-biome pick on new game.
4. **Wild encounters:** spawn by weight, Big Monster roll, level scaling (Flags X18).
5. **Catching:** cage throw animation (tiny → big), catch-chance formula.
6. **Battles:** turn order (speed, Quick ability), moves, abilities, Burned/Frozen, element tags, 2-turn Dig, Fetch stacking, switching.
7. **Team and backpack** screens.
8. **XP, leveling, evolution** (with move swaps on evolve).
9. **Shops, Magic Gems, Revivers.**
10. **Teleporting** at level 50: shop list + 5 pins.
11. **Collection screen** and center gate counter; **Avatar** fight and ending.
12. **Art pass:** base monster art first, placeholders elsewhere; designer drawings as they arrive.
13. **Tuning:** XP curve (level 50 ≈ after exploring all biomes), prices, catch rates.

## Folder map
See `README.md`.
