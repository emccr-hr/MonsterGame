# 0003: Monsters, moves, abilities, biomes and items are JSON data validated by Zod

**Decided 2026-11-21.**
Content lives in `src/data/*.json`: `monsters.json`, `moves.json`, `abilities.json`, `biomes.json`, `items.json`, `guide.json`. Zod schemas in `src/data/schema.ts` define every field. `npm run validate:data` checks shapes and cross-references (moves exist, evolve targets exist, levels within 1–100, every biome has wild monsters).
**Why:** the designer keeps adding monsters ("as many as I want", Round 48). A new monster is a data row plus art, never a code change.
Abilities and move effects are a **small fixed set of effect kinds** (damage, heal, team heal, status, stat boost, two-turn, weaken next attack, ignore by tag, immunity, first strike, damage reduction, dodge chance, heal per turn). A new ability is data if it fits an effect kind; if it doesn't, it gets an X flag first.
