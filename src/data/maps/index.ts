// World maps (M3). Simple character grids instead of Tiled, to go faster (Decisions-Log 2026-11-21).
// One character per 32 px tile. Legend (the meaning lives in src/world/grid.ts):
//   #  wall or fence        .  ground          =  path            ,  encounter ground (grass, sand, snow, ash)
//   T  tree, cactus, rock   ~  pond, ice, lava $  shop            R  Reviver
//   G  guide character      a  Avatar arena    A  arena gate      E  exit back to Ansonville
//   @  where the player starts (ground)       1-9 a gate to the biome named in `gates`
// Every row in a map must be the same length; tests/unit/world/maps.test.ts checks that and more.

export interface Palette {
  ground: number;
  path: number;
  encounter: number;
  wall: number;
  blocker: number;
  water: number;
}

export interface GameMap {
  /** Ansonville is "ansonville"; a biome map uses its biome id from biomes.json. */
  id: string;
  /** Shown top left, and used as the Phaser scene key. */
  name: string;
  /** The biome whose wild monsters live here, or null for Ansonville. */
  biome: string | null;
  /**
   * Where this map's wild monsters come from when it has no biome (Round 71): "ansonville" means
   * any first form from any biome (`MIXED_POOL` in src/logic/spawning.ts).
   */
  wildPool?: string;
  rows: readonly string[];
  /** Gate character to biome id. */
  gates?: Readonly<Record<string, string>>;
  palette: Palette;
  /** Pictures on top of the tiles (Round 65): sprite id in src/assets/sprites/tiles/, top-left tile, size in tiles. */
  decor?: readonly MapDecor[];
}

export interface MapDecor {
  sprite: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ANSONVILLE: GameMap = {
  id: 'ansonville',
  name: 'Ansonville',
  biome: null,
  // Round 71: grassy spots all around town and a ring around Avatar's arena, where any first-form monster can appear.
  wildPool: 'ansonville',
  // Layout follows the sketch in 03-World-and-Story/Setting.md: Snowy north, Desert and Volcano
  // up the sides, Forest and Beach down the sides, the Avatar arena in the middle.
  rows: [
    '#################2##################',
    '#TT..,,,,,,......=....,,,,,,,,...TT#',
    '#T...,,,,,,......=....,,,,,,,,....T#',
    '1===.............=.............====3',
    '#..=.............=.............=...#',
    '#..=============================...#',
    '#........$R......=......G..........#',
    '#................@.................#',
    '#...........,,,,,=,,,,,............#',
    '#..,,,,,,...,,aaaAaaa,,....,,,,,,..#',
    '#..,,,,,,...,,aaaaaaa,,....,,,,,,..#',
    '#..,,,,,,...,,aaaaaaa,,....,,,,,,..#',
    '#..,,,,,,...,,aaaaaaa,,....,,,,,,..#',
    '#...........,,aaaaaaa,,............#',
    '#...........,,,,,,,,,,,............#',
    '#..TT.......,,,,,,,,,,,........TT..#',
    '#..................................#',
    '#==============.......=============#',
    '4==...............................=5',
    '#T....,,,,,,,..........,,,,,,,....T#',
    '#TT...,,,,,,,..........,,,,,,,...TT#',
    '####################################',
  ],
  gates: { '1': 'desert', '2': 'snowy', '3': 'volcano', '4': 'forest', '5': 'beach' },
  palette: { ground: 0x8fc46a, path: 0xcfb98a, encounter: 0x5f9e3f, wall: 0x4a5a3a, blocker: 0x2f6d2f, water: 0x3b7dd8 },
};

// All five biomes share one layout for now (about one screen each): shop and Reviver by the
// entrance at the bottom, encounter ground around the edges. Different looks come with real art.
// 38x17 since Round 65 ("4 more grassy patches in each biome"): the first layout plus 4 columns on each
// side, each strip with 2 new grass patches.
const BIOME_ROWS = [
  '######################################',
  '#,,,.TT,,,,,,,,,,TTTT,,,,,,,,,,TT.,,,#',
  '#,,,.T,,,,,,,,,,,,TT,,,,,,,,,,,,T.,,,#',
  '#,,,.,,,,,,,,,,,,,..,,,,,,,,,,,,,.,,,#',
  '#....,,,,~~~,,,,,,..,,,,,,~~~,,,,....#',
  '#....,,,,~~~,,,,,,..,,,,,,~~~,,,,....#',
  '#....,,,,,,,,,,,,,..,,,,,,,,,,,,,....#',
  '#....................................#',
  '#,,,.....TT..............TT.......,,,#',
  '#,,,..............................,,,#',
  '#,,,.,,,,,,,,,,,..........,,,,,,,.,,,#',
  '#....,,,,,,,,,,,..........,,,,,,,....#',
  '#....,,,,,,TT,,,..........,,,TT,,....#',
  '#....,,,,,,,,,,,...$R.....,,,,,,,....#',
  '#..................@.................#',
  '#..................=.................#',
  '###################E##################',
] as const;

// The Beach: the same layout, plus a big palm tree on the left and right (Round 65).
const BEACH_ROWS = [
  '######################################',
  '#,,,.TT,,,,,,,,,,TTTT,,,,,,,,,,TT.,,,#',
  '#,,,.T,,,,,,,,,,,,TT,,,,,,,,,,,,T.,,,#',
  '#,,,.,,,,,,,,,,,,,..,,,,,,,,,,,,,.,,,#',
  '#....,,,,~~~,,,,,,..,,,,,,~~~,,,,....#',
  '#.TT.,,,,~~~,,,,,,..,,,,,,~~~,,,,.TT.#',
  '#.TT.,,,,,,,,,,,,,..,,,,,,,,,,,,,.TT.#',
  '#....................................#',
  '#,,,.....TT..............TT.......,,,#',
  '#,,,..............................,,,#',
  '#,,,.,,,,,,,,,,,..........,,,,,,,.,,,#',
  '#....,,,,,,,,,,,..........,,,,,,,....#',
  '#....,,,,,,TT,,,..........,,,TT,,....#',
  '#....,,,,,,,,,,,...$R.....,,,,,,,....#',
  '#..................@.................#',
  '#..................=.................#',
  '###################E##################',
] as const;

const biome = (id: string, name: string, palette: Palette, rows: readonly string[] = BIOME_ROWS, decor?: readonly MapDecor[]): GameMap => ({
  id,
  name,
  biome: id,
  rows,
  palette,
  decor,
});

/**
 * Big decor that blocks the tiles under it: the rows get blocker tiles ("T") there, so the player
 * walks around it, and the picture is drawn over them (drawMapArt skips their small trees).
 */
function withBigDecor(rows: readonly string[], decor: readonly MapDecor[]): readonly string[] {
  const out = rows.map((r) => [...r]);
  for (const d of decor)
    for (let y = d.y; y < d.y + d.h; y++)
      for (let x = d.x; x < d.x + d.w; x++) {
        if (out[y]?.[x] !== '.') throw new Error(`Big decor "${d.sprite}" needs plain ground at ${x},${y}`);
        out[y]![x] = 'T';
      }
  return out.map((r) => r.join(''));
}

/** Big trees in a few places in the Forest (Round 73). */
const FOREST_DECOR: readonly MapDecor[] = [{"sprite":"tree-big","x":2,"y":5,"w":2,"h":2},{"sprite":"tree-big","x":34,"y":5,"w":2,"h":2},{"sprite":"tree-big","x":12,"y":8,"w":2,"h":2},{"sprite":"tree-big","x":21,"y":9,"w":2,"h":2}];

/** An old skeleton poking out of the sand in the Desert (Round 74). */
const DESERT_DECOR: readonly MapDecor[] = [{"sprite":"skeleton","x":28,"y":8,"w":3,"h":2}];

/** Little glaciers on the sides of the Snowy map (Round 75). */
const SNOWY_DECOR: readonly MapDecor[] = [{"sprite":"glacier","x":1,"y":5,"w":2,"h":2},{"sprite":"glacier","x":35,"y":5,"w":2,"h":2},{"sprite":"glacier","x":1,"y":12,"w":2,"h":2},{"sprite":"glacier","x":35,"y":12,"w":2,"h":2}];

/** A big volcano on the left and right of the Volcano map (Round 72). */
const VOLCANO_DECOR: readonly MapDecor[] = [{"sprite":"volcano-big","x":1,"y":5,"w":3,"h":2},{"sprite":"volcano-big","x":34,"y":5,"w":3,"h":2}];

/** Big palm trees and fallen coconuts on the Beach (Round 65). */
const BEACH_DECOR: readonly MapDecor[] = [
  { sprite: 'palm-big', x: 2, y: 5, w: 2, h: 2 },
  { sprite: 'palm-big', x: 34, y: 5, w: 2, h: 2 },
  { sprite: 'coconut', x: 1, y: 7, w: 1, h: 1 },
  { sprite: 'coconut', x: 4, y: 6, w: 1, h: 1 },
  { sprite: 'coconut', x: 3, y: 7, w: 1, h: 1 },
  { sprite: 'coconut', x: 36, y: 7, w: 1, h: 1 },
  { sprite: 'coconut', x: 33, y: 6, w: 1, h: 1 },
  { sprite: 'coconut', x: 34, y: 7, w: 1, h: 1 },
];

// Colors: the chosen palette rows in 06-Art-and-Audio/Art-Mockups.html section 5 (owner, 2026-11-21).
// Forest and Beach kept their colors; Desert, Snowy and Volcano use the brighter rows.
export const BIOME_MAPS: readonly GameMap[] = [
  // Tall grass, trees, a pond.
  biome('forest', 'Forest', { ground: 0x7cb35a, path: 0xb89c6a, encounter: 0x3f8f3a, wall: 0x2f4f2f, blocker: 0x1f5a24, water: 0x3b7dd8 }, withBigDecor(BIOME_ROWS, FOREST_DECOR), FOREST_DECOR),
  // Soft sand, palm trees, tide pools.
  biome('beach', 'Beach', { ground: 0xf1e7c6, path: 0xd8c08c, encounter: 0xe2c16a, wall: 0x8a6d3b, blocker: 0x4f9a4a, water: 0x2e86c1 }, BEACH_ROWS, BEACH_DECOR),
  // Dunes, cactus, quicksand.
  biome('desert', 'Desert', { ground: 0xf6d77e, path: 0xd9a24e, encounter: 0xf0a830, wall: 0xb5652a, blocker: 0x3fae4a, water: 0xc88a4a }, withBigDecor(BIOME_ROWS, DESERT_DECOR), DESERT_DECOR),
  // Deep snow, pine trees, ice.
  biome('snowy', 'Snowy', { ground: 0xf4f8fb, path: 0xb9d4f0, encounter: 0x8fc3f2, wall: 0x2f5f9e, blocker: 0x1f7a4f, water: 0x4fb3f5 }, withBigDecor(BIOME_ROWS, SNOWY_DECOR), SNOWY_DECOR),
  // Ash, rocks, lava.
  biome('volcano', 'Volcano', { ground: 0x5a3430, path: 0x8f4f36, encounter: 0xa8746a, wall: 0x2a1414, blocker: 0x3a2020, water: 0xff4a1a }, withBigDecor(BIOME_ROWS, VOLCANO_DECOR), VOLCANO_DECOR),
];

export const MAPS: readonly GameMap[] = [ANSONVILLE, ...BIOME_MAPS];

export function mapById(id: string): GameMap {
  const map = MAPS.find((m) => m.id === id);
  if (!map) throw new Error(`No map with id "${id}"`);
  return map;
}
