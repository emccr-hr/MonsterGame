// The game's content, loaded from the JSON files and checked once at startup (ADR 0003).
// Scenes and state import from here; logic modules take content as a parameter so tests can pass their own.
import abilities from './abilities.json';
import biomes from './biomes.json';
import guide from './guide.json';
import items from './items.json';
import monsters from './monsters.json';
import moves from './moves.json';
import rules from './rules.json';
import type { Content } from './schema.ts';
import { validateContent } from './validate.ts';

function load(): Content {
  const result = validateContent({ monsters, moves, abilities, biomes, items, rules, guide });
  if (!result.content) {
    throw new Error(`Game data has problems (run npm run validate:data):\n${result.errors.join('\n')}`);
  }
  return result.content;
}

export const content: Content = load();
