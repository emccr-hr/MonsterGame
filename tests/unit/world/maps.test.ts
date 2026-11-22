import { describe, expect, it } from 'vitest';
import { content } from '../../../src/data';
import { ANSONVILLE, BIOME_MAPS, MAPS, mapById } from '../../../src/data/maps';
import {
  besideTile,
  canReach,
  findAll,
  gateTile,
  isWalkable,
  kindAt,
  kindOf,
  startTile,
  width,
} from '../../../src/world/grid';

describe('world maps', () => {
  it('has Ansonville plus one map per biome', () => {
    expect(BIOME_MAPS.map((m) => m.id).sort()).toEqual(content.biomes.map((b) => b.id).sort());
    for (const m of BIOME_MAPS) {
      expect(m.biome).toBe(m.id);
      expect(m.name).toBe(content.biomes.find((b) => b.id === m.id)?.name);
    }
    expect(new Set(MAPS.map((m) => m.name)).size).toBe(MAPS.length); // Names are scene keys.
  });

  for (const map of MAPS) {
    describe(map.name, () => {
      it('is a rectangle of known tiles with a wall all around', () => {
        const w = width(map);
        map.rows.forEach((row, y) => {
          expect(row.length, `row ${y}`).toBe(w);
          for (const ch of row) expect(kindOf(ch), `"${ch}" in row ${y}`).toBeDefined();
        });
        for (let x = 0; x < w; x++) {
          expect(isWalkable(kindAt(map, { x, y: 0 }))).toBe(false);
          expect(isWalkable(kindAt(map, { x, y: map.rows.length - 1 }))).toBe(false);
        }
        map.rows.forEach((_, y) => {
          expect(isWalkable(kindAt(map, { x: 0, y }))).toBe(false);
          expect(isWalkable(kindAt(map, { x: w - 1, y }))).toBe(false);
        });
      });

      it('has one start, and a shop and Reviver the player can reach', () => {
        expect(findAll(map, '@')).toHaveLength(1);
        const start = startTile(map);
        for (const ch of ['$', 'R']) {
          const [t] = findAll(map, ch);
          expect(t, ch).toBeDefined();
          expect(canReach(map, start, t!), ch).toBe(true);
        }
      });
    });
  }

  it('Ansonville has a reachable gate for every biome, a guide and the arena gate', () => {
    const start = startTile(ANSONVILLE);
    for (const b of content.biomes) {
      const gate = gateTile(ANSONVILLE, b.id);
      expect(gate, b.id).toBeDefined();
      expect(canReach(ANSONVILLE, start, gate!), b.id).toBe(true);
      expect(isWalkable(kindAt(ANSONVILLE, besideTile(ANSONVILLE, gate!)))).toBe(true);
    }
    for (const ch of ['G', 'A']) expect(canReach(ANSONVILLE, start, findAll(ANSONVILLE, ch)[0]!), ch).toBe(true);
  });

  it('the Snowy gate is straight up from the start (the smoke test walks it)', () => {
    const start = startTile(ANSONVILLE);
    const gate = gateTile(ANSONVILLE, 'snowy')!;
    expect(gate.x).toBe(start.x);
    for (let y = gate.y + 1; y < start.y; y++) expect(isWalkable(kindAt(ANSONVILLE, { x: start.x, y }))).toBe(true);
  });

  it('every biome has encounter ground and a reachable exit to Ansonville', () => {
    for (const map of BIOME_MAPS) {
      expect(findAll(map, ',').length, map.id).toBeGreaterThan(20);
      const [exit] = findAll(map, 'E');
      expect(canReach(map, startTile(map), exit!), map.id).toBe(true);
    }
    expect(findAll(ANSONVILLE, ',')).toHaveLength(0); // No wild monsters in town.
  });

  it('mapById finds maps and rejects unknown ids', () => {
    expect(mapById('forest').name).toBe('Forest');
    expect(() => mapById('moon')).toThrow();
  });
});
