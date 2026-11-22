import { describe, expect, it } from 'vitest';
import { mon, realContent } from '../helpers';
import { addXp, evolutionFor, evolve, xpToNext, xpYield } from '../../../src/logic/growth';
import { maxHp, species } from '../../../src/logic/monster';

const content = realContent();

describe('xpToNext and xpYield', () => {
  it('needs 10 x level XP', () => {
    expect(xpToNext(1)).toBe(10);
    expect(xpToNext(7)).toBe(70);
    expect(xpToNext(99)).toBe(990);
  });

  it('pays more XP for a higher level enemy', () => {
    expect(xpYield(10)).toBeGreaterThan(xpYield(5));
    expect(xpYield(5)).toBe(20);
  });
});

describe('addXp', () => {
  it('adds XP without leveling when it is not enough', () => {
    const r = addXp(content, mon(content, 'bushtail', 5), 20);
    expect(r.monster).toMatchObject({ level: 5, xp: 20 });
    expect(r.levelsGained).toBe(0);
  });

  it('levels up exactly at the XP needed', () => {
    const r = addXp(content, mon(content, 'bushtail', 1), 10);
    expect(r.monster).toMatchObject({ level: 2, xp: 0 });
    expect(r.levelsGained).toBe(1);
  });

  it('levels up several times from a big gain and keeps leftover XP', () => {
    // 10 + 20 + 30 + 40 = 100 to reach level 5, plus 5 left over
    const r = addXp(content, mon(content, 'bushtail', 1), 105);
    expect(r.monster).toMatchObject({ level: 5, xp: 5 });
    expect(r.levelsGained).toBe(4);
  });

  it('carries existing XP into the next level', () => {
    const r = addXp(content, mon(content, 'bushtail', 2, { xp: 15 }), 10);
    expect(r.monster).toMatchObject({ level: 3, xp: 5 });
  });

  it('raises HP by the max-HP gain', () => {
    const r = addXp(content, mon(content, 'bushtail', 5), xpToNext(5));
    expect(r.monster.level).toBe(6);
    expect(r.monster.hp).toBe(maxHp(content, r.monster));
  });

  it('keeps a damaged monster damaged by the same amount', () => {
    const start = mon(content, 'bushtail', 5);
    const hurt = { ...start, hp: start.hp - 4 };
    const r = addXp(content, hurt, xpToNext(5));
    expect(maxHp(content, r.monster) - r.monster.hp).toBe(4);
  });

  it('keeps a knocked-out monster at 0 HP', () => {
    const r = addXp(content, mon(content, 'bushtail', 5, { hp: 0 }), 500);
    expect(r.monster.level).toBeGreaterThan(5);
    expect(r.monster.hp).toBe(0);
  });

  it('stops at level 100 with XP 0', () => {
    const r = addXp(content, mon(content, 'bushtail', 99), 1_000_000);
    expect(r.monster).toMatchObject({ level: 100, xp: 0 });
    expect(r.levelsGained).toBe(1);
  });

  it('does nothing more at level 100', () => {
    const r = addXp(content, mon(content, 'bushtail', 100), 500);
    expect(r.monster).toMatchObject({ level: 100, xp: 0 });
    expect(r.levelsGained).toBe(0);
  });

  it('ignores negative XP', () => {
    const r = addXp(content, mon(content, 'bushtail', 5, { xp: 3 }), -50);
    expect(r.monster.xp).toBe(3);
  });

  it('does not change the monster it was given', () => {
    const start = mon(content, 'bushtail', 1);
    const copy = structuredClone(start);
    addXp(content, start, 200);
    expect(start).toEqual(copy);
  });

  it('says when a monster can evolve', () => {
    const r = addXp(content, mon(content, 'anti-ant', 14), 140);
    expect(r.monster.level).toBe(15);
    expect(r.canEvolveInto).toBe('queen-ant');
  });

  it('says null when it cannot evolve yet', () => {
    expect(addXp(content, mon(content, 'anti-ant', 5), 10).canEvolveInto).toBeNull();
  });
});

describe('evolutionFor', () => {
  it('is null just before the evolve level', () => {
    expect(evolutionFor(content, mon(content, 'blobbin', 24))).toBeNull();
  });

  it('gives the new form at the evolve level', () => {
    expect(evolutionFor(content, mon(content, 'blobbin', 25))).toBe('slimy');
    expect(evolutionFor(content, mon(content, 'anti-ant', 15))).toBe('queen-ant');
  });

  it('still gives it above the evolve level', () => {
    expect(evolutionFor(content, mon(content, 'blobbin', 60))).toBe('slimy');
  });

  it('is null for a final form', () => {
    expect(evolutionFor(content, mon(content, 'slimy', 100))).toBeNull();
    expect(evolutionFor(content, mon(content, 'queen-ant', 50))).toBeNull();
  });
});

describe('evolve', () => {
  it('swaps species and moves, keeps level', () => {
    const e = evolve(content, mon(content, 'blobbin', 25));
    expect(e.species).toBe('slimy');
    expect(e.moves).toEqual(species(content, 'slimy').moves);
    expect(e.level).toBe(25);
  });

  it('keeps uid, xp and Big', () => {
    const start = mon(content, 'blobbin', 25, { xp: 17, big: true });
    const e = evolve(content, start);
    expect(e).toMatchObject({ uid: start.uid, xp: 17, big: true });
  });

  it('keeps full HP full', () => {
    const e = evolve(content, mon(content, 'blobbin', 25));
    expect(e.hp).toBe(maxHp(content, e));
  });

  it('keeps about the same HP fraction', () => {
    const start = mon(content, 'blobbin', 25);
    const half = { ...start, hp: Math.floor(maxHp(content, start) / 2) };
    const e = evolve(content, half);
    expect(e.hp / maxHp(content, e)).toBeCloseTo(half.hp / maxHp(content, half), 1);
  });

  it('keeps a knocked-out monster at 0 HP', () => {
    expect(evolve(content, mon(content, 'blobbin', 25, { hp: 0 })).hp).toBe(0);
  });

  it('throws when not ready', () => {
    expect(() => evolve(content, mon(content, 'blobbin', 24))).toThrow();
    expect(() => evolve(content, mon(content, 'slimy', 50))).toThrow();
  });

  it('does not change the monster it was given', () => {
    const start = mon(content, 'blobbin', 25);
    const copy = structuredClone(start);
    evolve(content, start);
    expect(start).toEqual(copy);
  });
});
