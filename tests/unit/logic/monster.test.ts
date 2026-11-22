import { describe, expect, it } from 'vitest';
import { realContent } from '../helpers';
import { createMonster, isKnockedOut, maxHp, species, statsAt, statsOf } from '../../../src/logic/monster';

const base = { hp: 50, attack: 50, defense: 50, speed: 50 };

describe('statsAt', () => {
  it('gives known numbers at level 1', () => {
    expect(statsAt(base, 1, false, 0.1)).toEqual({ hp: 55, attack: 52, defense: 52, speed: 52 });
  });

  it('grows with level', () => {
    const low = statsAt(base, 5, false, 0.1);
    const high = statsAt(base, 50, false, 0.1);
    expect(high.hp).toBeGreaterThan(low.hp);
    expect(high.attack).toBeGreaterThan(low.attack);
    expect(high.defense).toBeGreaterThan(low.defense);
    expect(high.speed).toBeGreaterThan(low.speed);
  });

  it('grows HP faster than the other stats', () => {
    const l1 = statsAt(base, 1, false, 0.1);
    const l50 = statsAt(base, 50, false, 0.1);
    expect(l50.hp / l1.hp).toBeGreaterThan(l50.attack / l1.attack);
  });

  it('gives Big Monsters 10% more of every stat', () => {
    const normal = statsAt(base, 20, false, 0.1);
    const big = statsAt(base, 20, true, 0.1);
    for (const key of ['hp', 'attack', 'defense', 'speed'] as const) {
      expect(big[key]).toBeGreaterThanOrEqual(Math.floor(normal[key] * 1.1) - 1);
      expect(big[key]).toBeLessThanOrEqual(Math.ceil(normal[key] * 1.1) + 1);
      expect(big[key]).toBeGreaterThan(normal[key]);
    }
  });

  it('never goes below 1', () => {
    expect(statsAt({ hp: 0, attack: 0, defense: 0, speed: 0 }, 1, false, 0.1).hp).toBe(1);
  });
});

describe('species, statsOf, maxHp', () => {
  const content = realContent();

  it('finds a species', () => {
    expect(species(content, 'bushtail').name).toBeTruthy();
  });

  it('throws for an unknown species', () => {
    expect(() => species(content, 'nope')).toThrow(/Unknown monster/);
  });

  it('statsOf uses the Big boost from the rules', () => {
    const normal = statsOf(content, { species: 'bushtail', level: 10, big: false });
    const big = statsOf(content, { species: 'bushtail', level: 10, big: true });
    expect(big.hp).toBeGreaterThan(normal.hp);
  });

  it('maxHp matches statsOf hp', () => {
    const m = { species: 'hootle', level: 12, big: false };
    expect(maxHp(content, m)).toBe(statsOf(content, m).hp);
  });
});

describe('createMonster', () => {
  const content = realContent();

  it('starts at full HP with its species moves', () => {
    const m = createMonster(content, 'bushtail', 5, false, 7);
    expect(m.hp).toBe(maxHp(content, m));
    expect(m.moves).toEqual(species(content, 'bushtail').moves);
    expect(m).toMatchObject({ uid: 7, level: 5, xp: 0, big: false, burned: 0 });
  });

  it('copies the move list instead of sharing it', () => {
    const m = createMonster(content, 'bushtail', 5, false, 1);
    expect(m.moves).not.toBe(species(content, 'bushtail').moves);
  });

  it('raises level 0 and negative levels to 1', () => {
    expect(createMonster(content, 'bushtail', 0, false, 1).level).toBe(1);
    expect(createMonster(content, 'bushtail', -4, false, 1).level).toBe(1);
  });

  it('caps the level at levelCap', () => {
    expect(createMonster(content, 'bushtail', 500, false, 1).level).toBe(content.rules.levelCap);
  });

  it('rounds a fractional level down', () => {
    expect(createMonster(content, 'bushtail', 7.9, false, 1).level).toBe(7);
  });

  it('gives a Big Monster more HP', () => {
    const normal = createMonster(content, 'bushtail', 20, false, 1);
    const big = createMonster(content, 'bushtail', 20, true, 2);
    expect(big.hp).toBeGreaterThan(normal.hp);
  });

  it('throws for an unknown species', () => {
    expect(() => createMonster(content, 'nope', 5, false, 1)).toThrow();
  });
});

describe('isKnockedOut', () => {
  const content = realContent();

  it('is true at 0 HP only', () => {
    const m = createMonster(content, 'bushtail', 5, false, 1);
    expect(isKnockedOut(m)).toBe(false);
    expect(isKnockedOut({ ...m, hp: 1 })).toBe(false);
    expect(isKnockedOut({ ...m, hp: 0 })).toBe(true);
  });
});
