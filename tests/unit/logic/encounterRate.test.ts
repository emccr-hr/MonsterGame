import { describe, expect, it } from 'vitest';
import { DEFAULT_ENCOUNTER_RATE, stepOnEncounterGround } from '../../../src/logic/encounterRate';
import { createRng } from '../../../src/logic/rng';

describe('stepOnEncounterGround', () => {
  it('never starts an encounter during the safe steps', () => {
    const rng = createRng(1);
    let steps = 0;
    for (let i = 0; i < DEFAULT_ENCOUNTER_RATE.safeSteps; i++) {
      const r = stepOnEncounterGround(steps, rng, { chance: 1, safeSteps: DEFAULT_ENCOUNTER_RATE.safeSteps });
      expect(r.encounter).toBe(false);
      steps = r.stepsSince;
    }
    expect(stepOnEncounterGround(steps, rng, { chance: 1, safeSteps: 3 })).toEqual({ encounter: true, stepsSince: 0 });
  });

  it('never fires with chance 0', () => {
    const rng = createRng(2);
    let steps = 0;
    for (let i = 0; i < 100; i++) {
      const r = stepOnEncounterGround(steps, rng, { chance: 0, safeSteps: 0 });
      expect(r.encounter).toBe(false);
      steps = r.stepsSince;
    }
    expect(steps).toBe(100);
  });

  it('is the same for the same seed, and close to the chance over many steps', () => {
    const run = (seed: number) => {
      const rng = createRng(seed);
      let steps = 0;
      let hits = 0;
      for (let i = 0; i < 5000; i++) {
        const r = stepOnEncounterGround(steps, rng, { chance: 0.1, safeSteps: 0 });
        if (r.encounter) hits++;
        steps = r.stepsSince;
      }
      return hits;
    };
    expect(run(42)).toBe(run(42));
    expect(run(42)).toBeGreaterThan(400);
    expect(run(42)).toBeLessThan(600);
  });
});
