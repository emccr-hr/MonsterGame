import { describe, expect, it } from 'vitest';
import { realContent, scriptedRng } from '../helpers';
import { catchChance, throwCage } from '../../../src/logic/catching';

const rules = realContent().rules;

describe('catchChance', () => {
  it('is 30% at full HP', () => {
    expect(catchChance(100, 100, false, rules)).toBeCloseTo(0.3);
  });

  it('is 60% at half HP', () => {
    expect(catchChance(50, 100, false, rules)).toBeCloseTo(0.6);
  });

  it('rises as HP drops', () => {
    expect(catchChance(10, 100, false, rules)).toBeGreaterThan(catchChance(90, 100, false, rules));
  });

  it('is 0 for a knocked-out monster', () => {
    expect(catchChance(0, 100, false, rules)).toBe(0);
    expect(catchChance(-5, 100, true, rules)).toBe(0);
  });

  it('is 0 when max HP is 0', () => {
    expect(catchChance(5, 0, false, rules)).toBe(0);
  });

  it('is 80% as likely for a Big Monster', () => {
    expect(catchChance(50, 100, true, rules)).toBeCloseTo(0.6 * 0.8);
  });

  it('is capped at 95%', () => {
    const generous = { ...rules, catch: { ...rules.catch, missingHpBonus: 2 } };
    expect(catchChance(1, 100, false, generous)).toBeCloseTo(0.95);
  });

  it('treats HP above max as full HP', () => {
    expect(catchChance(500, 100, false, rules)).toBeCloseTo(0.3);
  });

  it('stays between 0 and 95% for any awake HP', () => {
    for (let hp = 1; hp <= 100; hp++) {
      const c = catchChance(hp, 100, false, rules);
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThanOrEqual(0.95);
    }
  });
});

describe('throwCage', () => {
  it('catches when the roll is lucky', () => {
    const r = throwCage(0.5, 0, rules, scriptedRng([0.1]));
    expect(r.result).toBe('caught');
  });

  it('escapes when the roll is unlucky', () => {
    const r = throwCage(0.5, 0, rules, scriptedRng([0.9, 0.5]));
    expect(r).toMatchObject({ result: 'escaped', failedThrows: 1, ranAway: false });
  });

  it('does not run away after the 2nd failed throw', () => {
    const second = throwCage(0.1, 1, rules, scriptedRng([0.9, 0.5]));
    expect(second).toMatchObject({ result: 'escaped', failedThrows: 2, ranAway: false });
  });

  it('runs away after the 3rd failed throw', () => {
    const third = throwCage(0.1, 2, rules, scriptedRng([0.9, 0.5]));
    expect(third).toMatchObject({ result: 'escaped', failedThrows: 3, ranAway: true });
  });

  it('a certain catch never fails', () => {
    expect(throwCage(1, 2, rules, scriptedRng([0.99])).result).toBe('caught');
  });

  it('an impossible catch always fails', () => {
    expect(throwCage(0, 0, rules, scriptedRng([0])).result).toBe('escaped');
  });

  it('shows 0 to 2 wobbles when it escapes', () => {
    for (const roll of [0, 0.5, 0.99]) {
      const r = throwCage(0, 0, rules, scriptedRng([0.9, roll]));
      if (r.result !== 'escaped') throw new Error('should escape');
      expect([0, 1, 2]).toContain(r.wobbles);
    }
  });
});
