import { describe, expect, it } from 'vitest';
import { content } from '../../../src/data';
import { ANSONVILLE, BIOME_MAPS, MAPS, mapById, paletteAt, zoneAt } from '../../../src/data/maps';
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
  });

  it("Ansonville has grassy spots all around town and a ring around Avatar's arena (Round 71), and the arena gate path stays open", () => {
    const grass = findAll(ANSONVILLE, ',');
    const arena = [...findAll(ANSONVILLE, 'a'), ...findAll(ANSONVILLE, 'A')];
    const nearArena = grass.filter((g) => arena.some((t) => Math.abs(t.x - g.x) <= 2 && Math.abs(t.y - g.y) <= 2));
    expect(nearArena.length).toBeGreaterThan(20);
    expect(grass.length - nearArena.length).toBeGreaterThan(60); // the spots around town
    // Never on the roads the smoke tests walk (rows 3 and 7, column 11).
    for (const g of grass) expect(g.y !== 3 && g.y !== 7 && !(g.x === 11 && g.y >= 3 && g.y <= 7), `${g.x},${g.y}`).toBe(true);
    // Straight down from the start to the arena gate without touching the grass.
    const start = startTile(ANSONVILLE);
    const gate = findAll(ANSONVILLE, 'A')[0]!;
    expect(gate.x).toBe(start.x);
    for (let y = start.y + 1; y < gate.y; y++) expect(kindAt(ANSONVILLE, { x: start.x, y })).not.toBe('encounter');
    expect(ANSONVILLE.wildPool).toBe('ansonville');
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

  it('every biome map has 8 more grass patches since Round 78 (16 or more), and is bigger (56x27)', () => {
    for (const m of BIOME_MAPS) {
      // The Beach gave three patches to the sea (Round 84).
      expect(patches(m.rows), m.id).toBeGreaterThanOrEqual(m.id === 'beach' ? 13 : 16);
      expect([m.rows[0]!.length, m.rows.length], m.id).toEqual([56, 27]);
    }
  });

  it('the Beach has a big palm tree on the left and the right, over blocker tiles, with coconuts on open sand', () => {
    const beach = mapById('beach');
    const palms = (beach.decor ?? []).filter((d) => d.sprite === 'palm-big');
    expect(palms.length).toBeGreaterThanOrEqual(2); // 8 since Round 78
    const w = beach.rows[0]!.length;
    expect(palms.some((p) => p.x < w / 2) && palms.some((p) => p.x > w / 2)).toBe(true);
    for (const p of palms)
      for (let dy = 0; dy < p.h; dy++) for (let dx = 0; dx < p.w; dx++) expect(beach.rows[p.y + dy]![p.x + dx], `palm at ${p.x},${p.y}`).toBe('T');
    const coconuts = (beach.decor ?? []).filter((d) => d.sprite === 'coconut');
    expect(coconuts.length).toBeGreaterThanOrEqual(4);
    for (const c of coconuts) expect(beach.rows[c.y]![c.x], `coconut at ${c.x},${c.y}`).toBe('.');
  });
});

describe('big scenery (Rounds 72-75)', () => {
  const big = (id: string, sprite: string) => (mapById(id).decor ?? []).filter((d) => d.sprite === sprite);
  it('Forest big trees, a Desert skeleton, two Volcano volcanoes and Snowy glaciers, each on blocker tiles', () => {
    expect(big('forest', 'tree-big').length).toBeGreaterThanOrEqual(8);
    expect(big('desert', 'skeleton').length).toBeGreaterThanOrEqual(4); // more since Round 78
    const volcanoes = big('volcano', 'volcano-big');
    expect(volcanoes.length).toBeGreaterThanOrEqual(4); // more since Round 78
    const w = mapById('volcano').rows[0]!.length;
    expect(volcanoes.some((v) => v.x < w / 2) && volcanoes.some((v) => v.x > w / 2)).toBe(true);
    expect(big('snowy', 'glacier').length).toBeGreaterThanOrEqual(8);
    for (const id of ['forest', 'desert', 'volcano', 'snowy']) {
      const m = mapById(id);
      // Standing scenery blocks its tiles; moving scenery (monkeys, crabs, fish) and coconuts don't.
      for (const d of (m.decor ?? []).filter((x) => !x.swing && !x.shuttle && !x.jump && x.sprite !== 'coconut'))
        for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) expect(m.rows[y]![x], `${id} ${d.sprite} at ${x},${y}`).toBe('T');
    }
  });

  it('every biome can still reach its exit from the start', () => {
    for (const m of BIOME_MAPS) expect(canReach(m, startTile(m), findAll(m, 'E')[0]!), m.id).toBe(true);
  });
});

describe('the Desert watering hole (Round 79)', () => {
  it('has a watering hole with giraffes, an elephant and a lion that lift their heads, all on blocker tiles', () => {
    const desert = mapById('desert');
    const decor = desert.decor ?? [];
    expect(decor.some((d) => d.sprite === 'watering-hole')).toBe(true);
    for (const animal of ['giraffe', 'elephant', 'lion']) {
      const a = decor.find((d) => d.sprite === `${animal}-drink`);
      expect(a?.alt, animal).toBe(`${animal}-up`);
      expect(desert.rows[a!.y]![a!.x], animal).toBe('T');
    }
  });
});

describe("Ansonville's five areas and the frozen Dumble (Rounds 80-81)", () => {
  it('each part of Ansonville belongs to the biome whose gate is nearest', () => {
    const zones = new Set<string>();
    ANSONVILLE.rows.forEach((row, y) => [...row].forEach((_, x) => zones.add(zoneAt(ANSONVILLE, x, y) ?? 'none')));
    expect([...zones].sort()).toEqual(['beach', 'desert', 'forest', 'snowy', 'volcano']);
    for (const [ch, biome] of Object.entries(ANSONVILLE.gates ?? {})) {
      const gate = findAll(ANSONVILLE, ch)[0]!;
      expect(zoneAt(ANSONVILLE, gate.x, gate.y)).toBe(biome);
    }
    // Colors come from that biome, but the town's paths stay one color.
    const snowGate = gateTile(ANSONVILLE, 'snowy')!;
    expect(paletteAt(ANSONVILLE, snowGate.x, snowGate.y + 1).ground).toBe(mapById('snowy').palette.ground);
    expect(paletteAt(ANSONVILLE, snowGate.x, snowGate.y + 1).path).toBe(ANSONVILLE.palette.path);
    expect(zoneAt(mapById('forest'), 3, 3)).toBeNull();
  });

  it('Snowy has a big glacier with a Dumble frozen inside, on blocker tiles', () => {
    const snowy = mapById('snowy');
    const d = (snowy.decor ?? []).find((x) => x.sprite === 'glacier-dumble')!;
    expect(d).toBeDefined();
    for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) expect(snowy.rows[y]![x]).toBe('T');
  });
});

describe('monkeys, a dragon and the sea (Rounds 82-84)', () => {
  it('the Forest vine tree has swinging monkeys, the Volcano a fire-breathing dragon, the Beach a sea with crabs and fish', () => {
    const forest = mapById('forest').decor ?? [];
    expect(forest.some((d) => d.sprite === 'tree-vines')).toBe(true);
    expect(forest.filter((d) => d.sprite === 'monkey-swing' && d.swing).length).toBeGreaterThanOrEqual(2);
    const dragon = (mapById('volcano').decor ?? []).find((d) => d.sprite === 'dragon');
    expect(dragon?.alt).toBe('dragon-fire');
    const beach = mapById('beach');
    const w = beach.rows[0]!.length;
    // The right fifth is sea.
    for (let y = 1; y < beach.rows.length - 1; y++) expect(beach.rows[y]!.slice(Math.ceil(w * 0.82), w - 1)).toMatch(/^~+$/);
    expect((beach.decor ?? []).filter((d) => d.sprite === 'beach-crab' && d.shuttle).length).toBeGreaterThanOrEqual(3);
    expect((beach.decor ?? []).filter((d) => d.sprite === 'fish' && d.jump).length).toBeGreaterThanOrEqual(3);
  });
});
