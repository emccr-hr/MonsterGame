// Every monster has its own placeholder look from data (owner, 2026-11-22; Art-Direction.md).
import { describe, expect, it } from 'vitest';
import { monster } from '../../../src/data/schema';
import { realContent } from '../helpers';

const content = realContent();
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]!));
const HEX = /^#[0-9a-fA-F]{6}$/;

describe('monster art', () => {
  it('every monster has art with valid hex colors', () => {
    for (const m of content.monsters) {
      expect(m.art, m.id).toBeDefined();
      for (const c of [m.art.body, m.art.accent, ...(m.art.extra ?? [])]) expect(c, m.id).toMatch(HEX);
    }
  });

  it('no two monsters in the same biome share a body color, or look nearly the same', () => {
    const biomes = new Set(content.monsters.map((m) => m.biome));
    for (const b of biomes) {
      const list = content.monsters.filter((m) => m.biome === b);
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const [a, c] = [list[i]!, list[j]!];
          expect(a.art.body.toLowerCase(), `${a.id} vs ${c.id}`).not.toBe(c.art.body.toLowerCase());
          expect(distance(a.art.body, c.art.body), `${a.id} vs ${c.id}`).toBeGreaterThanOrEqual(30);
        }
    }
  });

  it('accent colors stand out from the body', () => {
    for (const m of content.monsters) expect(distance(m.art.body, m.art.accent), m.id).toBeGreaterThanOrEqual(60);
  });
});

describe('the art schema', () => {
  const withArt = (art: unknown) => monster.safeParse({ ...content.monsters[0], art }).success;

  it('rejects bad colors, unknown markings and stray extra colors', () => {
    expect(withArt({ body: '#7a4a26', accent: '#ffffff', markings: 'patch' })).toBe(true);
    expect(withArt({ body: 'brown', accent: '#ffffff', markings: 'patch' })).toBe(false);
    expect(withArt({ body: '#7a4a26', accent: '#ffffff', markings: 'polka' })).toBe(false);
    expect(withArt({ body: '#7a4a26', accent: '#ffffff', markings: 'spots', extra: ['#000000'] })).toBe(false);
    expect(withArt({ body: '#7a4a26', accent: '#ffffff', markings: 'segments' })).toBe(false);
    expect(withArt(undefined)).toBe(false);
  });
});
