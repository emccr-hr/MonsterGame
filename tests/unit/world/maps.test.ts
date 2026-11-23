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

  it('encounter ground looks different from plain ground and paths in every biome', () => {
    const rgb = (c: number) => [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
    const distance = (a: number, b: number) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]!));
    for (const { id, palette } of BIOME_MAPS) {
      expect(distance(palette.encounter, palette.ground), id).toBeGreaterThanOrEqual(40);
      expect(distance(palette.encounter, palette.path), id).toBeGreaterThanOrEqual(20);
    }
  });

  it('mapById finds maps and rejects unknown ids', () => {
    expect(mapById('forest').name).toBe('Forest');
    expect(() => mapById('moon')).toThrow();
  });
});

// Round 65: "4 more grassy patches in each biome", and big palm trees with coconuts at the Beach.
describe('bigger biome maps (Round 65)', () => {
  /** Separate patches of encounter ground (tiles touching up, down, left or right count as one). */
  const patches = (rows: readonly string[]): number => {
    const seen = new Set<string>();
    let count = 0;
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== ',' || seen.has(`${x},${y}`)) return;
        count++;
        const stack = [[x, y]];
        while (stack.length) {
          const [cx, cy] = stack.pop()!;
          const key = `${cx},${cy}`;
          if (seen.has(key) || rows[cy!]?.[cx!] !== ',') continue;
          seen.add(key);
          stack.push([cx! + 1, cy!], [cx! - 1, cy!], [cx!, cy! + 1], [cx!, cy! - 1]);
        }
      }),
    );
    return count;
  };

  it('every biome map has at least 4 more grass patches than the first layout (4, so 8 or more)', () => {
    for (const m of BIOME_MAPS) expect(patches(m.rows), m.id).toBeGreaterThanOrEqual(8);
  });

  it('the Beach has a big palm tree on the left and the right, over blocker tiles, with coconuts on open sand', () => {
    const beach = mapById('beach');
    const palms = (beach.decor ?? []).filter((d) => d.sprite === 'palm-big');
    expect(palms).toHaveLength(2);
    const w = beach.rows[0]!.length;
    expect(palms.some((p) => p.x < w / 2) && palms.some((p) => p.x > w / 2)).toBe(true);
    for (const p of palms)
      for (let dy = 0; dy < p.h; dy++) for (let dx = 0; dx < p.w; dx++) expect(beach.rows[p.y + dy]![p.x + dx], `palm at ${p.x},${p.y}`).toBe('T');
    const coconuts = (beach.decor ?? []).filter((d) => d.sprite === 'coconut');
    expect(coconuts.length).toBeGreaterThanOrEqual(4);
    for (const c of coconuts) expect(beach.rows[c.y]![c.x], `coconut at ${c.x},${c.y}`).toBe('.');
  });
});
