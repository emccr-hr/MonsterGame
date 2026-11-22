// Step-based wild encounters (M3 placeholder; the designer hasn't picked visible wild monsters yet,
// Open-Questions F). Each step on encounter ground may start an encounter, after a few safe steps.
import type { Rng } from './rng';

export interface EncounterRate {
  /** Chance per step on encounter ground, once the safe steps are used up. */
  chance: number;
  /** Steps right after an encounter (or entering a map) that never start one. */
  safeSteps: number;
}

/** Proposed numbers; M4 may tune them. */
export const DEFAULT_ENCOUNTER_RATE: EncounterRate = { chance: 0.1, safeSteps: 3 };

/**
 * One step on encounter ground. Takes the steps taken since the last encounter and returns whether
 * a wild monster appears, plus the new count (back to 0 when one does).
 */
export function stepOnEncounterGround(
  stepsSince: number,
  rng: Rng,
  rate: EncounterRate = DEFAULT_ENCOUNTER_RATE,
): { encounter: boolean; stepsSince: number } {
  const steps = stepsSince + 1;
  if (steps > rate.safeSteps && rng.chance(rate.chance)) return { encounter: true, stepsSince: 0 };
  return { encounter: false, stepsSince: steps };
}
