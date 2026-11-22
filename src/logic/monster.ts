// A caught (or wild) monster, and its stats at a level. Plain data, so it saves as JSON.
import type { BaseStats, Content, Monster as Species } from '../data/schema.ts';
import { BALANCE } from './balance.ts';

export interface MonsterInstance {
  /** Unique per save file. */
  uid: number;
  species: string;
  level: number;
  /** XP gained toward the next level. */
  xp: number;
  hp: number;
  big: boolean;
  moves: string[];
  /** Burned turns left (0 = not burned). Frozen only lasts inside a battle. */
  burned: number;
}

export type Stats = BaseStats;

export function species(content: Content, id: string): Species {
  const s = content.monsters.find((m) => m.id === id);
  if (!s) throw new Error(`Unknown monster "${id}"`);
  return s;
}

/** Stats at a level. Big Monsters get the Big bonus from rules.json. */
export function statsAt(base: BaseStats, level: number, big: boolean, bigBoost: number): Stats {
  const boost = big ? 1 + bigBoost : 1;
  const grow = (value: number, k: number) => Math.max(1, Math.floor(((value * (k + level)) / k) * boost));
  return {
    hp: grow(base.hp, BALANCE.HP_LEVEL_BASE),
    attack: grow(base.attack, BALANCE.STAT_LEVEL_BASE),
    defense: grow(base.defense, BALANCE.STAT_LEVEL_BASE),
    speed: grow(base.speed, BALANCE.STAT_LEVEL_BASE),
  };
}

export function statsOf(content: Content, m: Pick<MonsterInstance, 'species' | 'level' | 'big'>): Stats {
  return statsAt(species(content, m.species).baseStats, m.level, m.big, content.rules.big.statBoost);
}

export function maxHp(content: Content, m: Pick<MonsterInstance, 'species' | 'level' | 'big'>): number {
  return statsOf(content, m).hp;
}

/** A fresh monster at full HP with its species' moves. */
export function createMonster(content: Content, speciesId: string, level: number, big: boolean, uid: number): MonsterInstance {
  const s = species(content, speciesId);
  const lvl = Math.min(Math.max(1, Math.floor(level)), content.rules.levelCap);
  const m: MonsterInstance = { uid, species: s.id, level: lvl, xp: 0, hp: 0, big, moves: [...s.moves], burned: 0 };
  m.hp = maxHp(content, m);
  return m;
}

export const isKnockedOut = (m: MonsterInstance): boolean => m.hp <= 0;
