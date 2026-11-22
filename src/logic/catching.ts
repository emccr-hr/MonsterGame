// Catching (Mechanics.md, "Catch chance", agreed Round 58).
import type { Rules } from '../data/schema.ts';
import type { Rng } from './rng.ts';

/** Chance from 0 to 1. A knocked-out monster can't be caught (0). */
export function catchChance(hp: number, maxHp: number, big: boolean, rules: Rules): number {
  if (hp <= 0 || maxHp <= 0) return 0;
  const missing = 1 - Math.min(hp, maxHp) / maxHp;
  const chance = Math.min(rules.catch.base + rules.catch.missingHpBonus * missing, rules.catch.cap);
  return big ? chance * rules.big.catchMultiplier : chance;
}

export type ThrowResult =
  | { result: 'caught'; wobbles: 1 | 2 | 3 }
  | { result: 'escaped'; wobbles: 0 | 1 | 2; failedThrows: number; ranAway: boolean };

/**
 * One cage throw. `failedThrows` is how many throws already failed on this monster; after
 * rules.catch.maxFailedThrows misses, it runs away. Wobbles are just for the animation.
 */
export function throwCage(chance: number, failedThrows: number, rules: Rules, rng: Rng): ThrowResult {
  if (rng.chance(chance)) return { result: 'caught', wobbles: 3 };
  const failed = failedThrows + 1;
  return {
    result: 'escaped',
    wobbles: rng.int(0, 2) as 0 | 1 | 2,
    failedThrows: failed,
    ranAway: failed >= rules.catch.maxFailedThrows,
  };
}
