// XP, leveling and evolution (Mechanics.md "Levels", Progression doc: evolve at the monster's own level).
import type { Content } from '../data/schema.ts';
import { BALANCE } from './balance.ts';
import { maxHp, species, type MonsterInstance } from './monster.ts';

/** XP needed to go from `level` to `level + 1`. */
export const xpToNext = (level: number): number => BALANCE.XP_PER_LEVEL * level;

/** XP for beating a wild monster of this level. */
export const xpYield = (enemyLevel: number): number => BALANCE.XP_YIELD * enemyLevel;

export interface GrowthResult {
  monster: MonsterInstance;
  levelsGained: number;
  /** Set when the monster reached its evolution level and should evolve now. */
  canEvolveInto: string | null;
}

/** Adds XP, levels up as many times as it earns (up to the cap). HP grows by the max-HP gain. */
export function addXp(content: Content, m: MonsterInstance, amount: number): GrowthResult {
  const cap = content.rules.levelCap;
  const next = { ...m, moves: [...m.moves] };
  let levelsGained = 0;
  if (next.level < cap) next.xp += Math.max(0, Math.floor(amount));
  while (next.level < cap && next.xp >= xpToNext(next.level)) {
    const before = maxHp(content, next);
    next.xp -= xpToNext(next.level);
    next.level++;
    levelsGained++;
    if (next.hp > 0) next.hp += maxHp(content, next) - before;
  }
  if (next.level >= cap) next.xp = 0;
  return { monster: next, levelsGained, canEvolveInto: evolutionFor(content, next) };
}

/** The species this monster evolves into right now, or null. */
export function evolutionFor(content: Content, m: MonsterInstance): string | null {
  const evo = species(content, m.species).evolvesTo;
  return evo && m.level >= evo.level ? evo.monster : null;
}

/** Evolves: new species and its moves, same level and XP, HP keeps the same fraction of max. */
export function evolve(content: Content, m: MonsterInstance): MonsterInstance {
  const into = evolutionFor(content, m);
  if (!into) throw new Error(`${m.species} can't evolve at level ${m.level}`);
  const before = maxHp(content, m);
  const evolved: MonsterInstance = { ...m, species: into, moves: [...species(content, into).moves] };
  const after = maxHp(content, evolved);
  evolved.hp = m.hp <= 0 ? 0 : Math.max(1, Math.round((m.hp / before) * after));
  return evolved;
}
