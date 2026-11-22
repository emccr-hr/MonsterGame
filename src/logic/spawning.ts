// Wild spawns (Mechanics.md "Spawning", Monster-List.md "Spawn chances", Flags X18 for levels).
import type { Content } from '../data/schema.ts';
import { BALANCE } from './balance.ts';
import type { Rng } from './rng.ts';

export interface Spawn {
  species: string;
  level: number;
  big: boolean;
}

/** The biome's spawn table: species and weight. Weights are shared out fairly (they needn't total 100). */
export function spawnTable(content: Content, biome: string): { item: string; weight: number }[] {
  return content.monsters
    .filter((m) => m.kind === 'monster' && m.biome === biome && m.spawnWeight !== null)
    .map((m) => ({ item: m.id, weight: m.spawnWeight! }));
}

/** Wild level: around the team's average level (±2), at least 2. With no team: 2–4. */
export function wildLevel(teamLevels: readonly number[], levelCap: number, rng: Rng): number {
  if (teamLevels.length === 0) return rng.int(BALANCE.FIRST_CATCH_LEVEL.min, BALANCE.FIRST_CATCH_LEVEL.max);
  const avg = Math.round(teamLevels.reduce((a, b) => a + b, 0) / teamLevels.length);
  const level = avg + rng.int(-BALANCE.WILD_LEVEL_SPREAD, BALANCE.WILD_LEVEL_SPREAD);
  return Math.min(levelCap, Math.max(BALANCE.WILD_MIN_LEVEL, level));
}

/** Pick a monster by weight, then roll Big (after the pick, as the docs say), then its level. */
export function rollSpawn(content: Content, biome: string, teamLevels: readonly number[], rng: Rng): Spawn {
  const table = spawnTable(content, biome);
  if (table.length === 0) throw new Error(`No wild monsters in biome "${biome}"`);
  const pick = rng.weighted(table);
  const big = rng.chance(content.rules.big.chance);
  return { species: pick, level: wildLevel(teamLevels, content.rules.levelCap, rng), big };
}
