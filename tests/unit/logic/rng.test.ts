import { describe, expect, it } from 'vitest';
import { createRng, seedFromString } from '../../../src/logic/rng';

describe('createRng', () => {
  it('gives the same numbers for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('gives different numbers for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('matches a known sequence (guards against accidental algorithm changes, which would break saves)', () => {
    const rng = createRng(12345);
    expect([rng.next(), rng.next(), rng.next()].map((n) => n.toFixed(8))).toMatchInlineSnapshot(`
      [
        "0.97972827",
        "0.30675226",
        "0.48420542",
      ]
    `);
  });

  it('next() stays in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('int() covers both ends and nothing outside', () => {
    const rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) seen.add(rng.int(1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('int() rejects bad ranges', () => {
    const rng = createRng(1);
    expect(() => rng.int(5, 1)).toThrow(RangeError);
    expect(() => rng.int(1.5, 3)).toThrow(RangeError);
  });

  it('chance() is never at 0 and always at 1, and close to p in between', () => {
    const rng = createRng(3);
    let hits = 0;
    for (let i = 0; i < 10_000; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
      if (rng.chance(0.3)) hits++;
    }
    expect(hits / 10_000).toBeGreaterThan(0.27);
    expect(hits / 10_000).toBeLessThan(0.33);
  });

  it('pick() returns an item from the list and rejects an empty list', () => {
    const rng = createRng(5);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) expect(items).toContain(rng.pick(items));
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it('weighted() follows the weights and never picks weight 0', () => {
    const rng = createRng(11);
    const table = [
      { item: 'common', weight: 70 },
      { item: 'rare', weight: 30 },
      { item: 'never', weight: 0 },
    ];
    const counts: Record<string, number> = { common: 0, rare: 0, never: 0 };
    for (let i = 0; i < 10_000; i++) counts[rng.weighted(table)]!++;
    expect(counts.never).toBe(0);
    expect(counts.common! / 10_000).toBeGreaterThan(0.67);
    expect(counts.common! / 10_000).toBeLessThan(0.73);
  });

  it('weighted() rejects bad tables', () => {
    const rng = createRng(1);
    expect(() => rng.weighted([])).toThrow(RangeError);
    expect(() => rng.weighted([{ item: 'x', weight: 0 }])).toThrow(RangeError);
    expect(() => rng.weighted([{ item: 'x', weight: -1 }])).toThrow(RangeError);
    expect(() => rng.weighted([{ item: 'x', weight: Number.NaN }])).toThrow(RangeError);
  });

  it('getState/setState resumes the exact same sequence (for save files)', () => {
    const rng = createRng(2026);
    rng.next();
    rng.next();
    const saved = rng.getState();
    const expected = [rng.next(), rng.next(), rng.next()];
    const restored = createRng(0);
    restored.setState(saved);
    expect([restored.next(), restored.next(), restored.next()]).toEqual(expected);
  });
});

describe('seedFromString', () => {
  it('is stable and gives a 32-bit unsigned number', () => {
    const s = seedFromString('Ansonville');
    expect(s).toBe(seedFromString('Ansonville'));
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
    expect(seedFromString('Forest')).not.toBe(s);
  });
});
