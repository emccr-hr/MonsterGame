import { describe, expect, it } from 'vitest';
import { realContent, scriptedRng } from '../helpers';
import { createRng } from '../../../src/logic/rng';
import { rollSpawn, spawnTable, wildLevel } from '../../../src/logic/spawning';

const content = realContent();
const biomes = ['forest', 'beach', 'desert', 'snowy', 'volcano'];

describe('spawnTable', () => {
  it('has 3 wild species in every biome', () => {
    for (const b of biomes) expect(spawnTable(content, b)).toHaveLength(3);
  });

  it('uses the weights from monsters.json', () => {
    const forest = Object.fromEntries(spawnTable(content, 'forest').map((e) => [e.item, e.weight]));
    expect(forest).toEqual({ peggy: 5, bushtail: 55, hootle: 40 });
  });

  it('has no evolved forms and no Avatar', () => {
    const all = biomes.flatMap((b) => spawnTable(content, b).map((e) => e.item));
    const evolved = content.monsters.filter((m) => m.evolvesFrom).map((m) => m.id);
    for (const id of all) {
      expect(evolved).not.toContain(id);
      expect(id).not.toBe('avatar');
    }
  });

  it('is empty for an unknown biome', () => {
    expect(spawnTable(content, 'moon')).toEqual([]);
  });
});

describe('rollSpawn', () => {
  it('roughly follows the weights', () => {
    const rng = createRng(2024);
    const counts: Record<string, number> = {};
    const n = 6000;
    for (let i = 0; i < n; i++) {
      const s = rollSpawn(content, 'forest', [], rng);
      counts[s.species] = (counts[s.species] ?? 0) + 1;
    }
    expect(counts.bushtail! / n).toBeGreaterThan(0.49);
    expect(counts.bushtail! / n).toBeLessThan(0.61);
    expect(counts.hootle! / n).toBeGreaterThan(0.34);
    expect(counts.hootle! / n).toBeLessThan(0.46);
    expect(counts.peggy! / n).toBeGreaterThan(0.02);
    expect(counts.peggy! / n).toBeLessThan(0.09);
  });

  it('only gives species from that biome', () => {
    const rng = createRng(5);
    const allowed = spawnTable(content, 'volcano').map((e) => e.item);
    for (let i = 0; i < 200; i++) expect(allowed).toContain(rollSpawn(content, 'volcano', [], rng).species);
  });

  it('makes about 1 in 100 Big', () => {
    const rng = createRng(99);
    const n = 30_000;
    let big = 0;
    for (let i = 0; i < n; i++) if (rollSpawn(content, 'beach', [], rng).big) big++;
    expect(big / n).toBeGreaterThan(0.005);
    expect(big / n).toBeLessThan(0.02);
  });

  it('can force Big and not-Big with scripted rolls', () => {
    expect(rollSpawn(content, 'forest', [], scriptedRng([0.5, 0.0])).big).toBe(true);
    expect(rollSpawn(content, 'forest', [], scriptedRng([0.5, 0.5])).big).toBe(false);
  });

  it('throws for an unknown biome', () => {
    expect(() => rollSpawn(content, 'moon', [], createRng(1))).toThrow(/No wild monsters/);
  });

  it('is the same for the same seed', () => {
    const a = rollSpawn(content, 'snowy', [10], createRng(8));
    const b = rollSpawn(content, 'snowy', [10], createRng(8));
    expect(a).toEqual(b);
  });
});

describe('wildLevel', () => {
  it('is 2 to 4 with no team', () => {
    const rng = createRng(3);
    for (let i = 0; i < 300; i++) {
      const l = wildLevel([], 100, rng);
      expect(l).toBeGreaterThanOrEqual(2);
      expect(l).toBeLessThanOrEqual(4);
    }
  });

  it('can reach both ends of 2 to 4', () => {
    expect(wildLevel([], 100, scriptedRng([0]))).toBe(2);
    expect(wildLevel([], 100, scriptedRng([0.999]))).toBe(4);
  });

  it('is within 2 of the team average', () => {
    const rng = createRng(4);
    for (let i = 0; i < 300; i++) {
      const l = wildLevel([10, 20, 30], 100, rng);
      expect(l).toBeGreaterThanOrEqual(18);
      expect(l).toBeLessThanOrEqual(22);
    }
  });

  it('never goes below 2', () => {
    expect(wildLevel([1], 100, scriptedRng([0]))).toBe(2);
    const rng = createRng(6);
    for (let i = 0; i < 200; i++) expect(wildLevel([1, 2], 100, rng)).toBeGreaterThanOrEqual(2);
  });

  it('never goes above the cap', () => {
    expect(wildLevel([100], 100, scriptedRng([0.999]))).toBe(100);
    expect(wildLevel([50], 50, scriptedRng([0.999]))).toBe(50);
  });
});
