// Shared test helpers: the real game content (checked), and small builders.
import abilities from '../../src/data/abilities.json';
import biomes from '../../src/data/biomes.json';
import guide from '../../src/data/guide.json';
import items from '../../src/data/items.json';
import monsters from '../../src/data/monsters.json';
import moves from '../../src/data/moves.json';
import rules from '../../src/data/rules.json';
import type { Content } from '../../src/data/schema';
import { validateContent } from '../../src/data/validate';
import { createMonster, type MonsterInstance } from '../../src/logic/monster';
import type { Rng } from '../../src/logic/rng';

/** A fresh, deep copy of the real content each call, so a test can change it safely. */
export function realContent(): Content {
  const result = validateContent(structuredClone({ monsters, moves, abilities, biomes, items, rules, guide }));
  if (!result.content) throw new Error(result.errors.join('\n'));
  return result.content;
}

let uid = 1000;
export function mon(content: Content, species: string, level = 10, opts: Partial<MonsterInstance> = {}): MonsterInstance {
  return { ...createMonster(content, species, level, opts.big ?? false, uid++), ...opts };
}

/**
 * A scripted Rng: next() returns the listed numbers in order, then `fallback` forever.
 * Lets a test force rolls (0 = "yes" for any chance, 0.999 = "no").
 */
export function scriptedRng(values: number[], fallback = 0.5): Rng {
  const queue = [...values];
  let state = 0;
  const next = () => (queue.length ? queue.shift()! : fallback);
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => (p <= 0 ? false : p >= 1 ? true : next() < p),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    weighted: (items) => {
      const total = items.reduce((s, i) => s + i.weight, 0);
      let roll = next() * total;
      for (const i of items) {
        if (roll < i.weight) return i.item;
        roll -= i.weight;
      }
      return items[items.length - 1]!.item;
    },
    getState: () => state,
    setState: (s) => {
      state = s;
    },
  };
}
