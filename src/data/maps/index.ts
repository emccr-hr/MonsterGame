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
   * Ansonville (Round 80): split into five areas, one per biome. Each tile takes the colors and trees
   * of the biome whose gate is nearest (`zoneAt`, `paletteAt`).
   */
  zoned?: boolean;
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
  /** Size as a multiple of its block (default 2 for big decor, 0.7 for coconuts). */
  scale?: number;
  /** Mirror it (sprites face left). */
  flip?: boolean;
  /** Lies flat on the ground (a pond): drawn under monsters and the player. */
  flat?: boolean;
  /** Animation (Round 79): now and then it switches to this other picture for a moment (an animal lifting its head). */
  alt?: string;
  /** Animation (Round 82): hangs from the top of its block and swings back and forth (a monkey on a vine). */
  swing?: boolean;
  /** Animation (Round 84): walks this many tiles (x, y) and back, again and again (a crab coming out of the sea). */
  shuttle?: readonly [number, number];
  /** Animation (Round 84): now and then leaps up out of the water somewhere in its block (a fish). */
  jump?: boolean;
}

export const ANSONVILLE: GameMap = {
  id: 'ansonville',
  name: 'Ansonville',
  biome: null,
  // Round 71: grassy spots all around town and a ring around Avatar's arena, where any first-form monster can appear.
  wildPool: 'ansonville',
  zoned: true,
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
// 56x27 since Round 78 ("make all biomes bigger... eight new spawning platforms in each biome"): the
// Round 65 map sits at the bottom middle (exit, shop and Reviver where they were), with 8 new grass
// patches, a pond and room for more big scenery in the new space above and to the sides. The shop and
// Reviver stand in the middle of the map, straight up from the entrance (Round 85).
const BIOME_ROWS = [
  '########################################################',
  '#......................................................#',
  '#..,,,,,,,,....,,,,,,,,,,......,,,,,,,,,,....,,,,,,,,..#',
  '#..,,,,,,,,....,,,,,,,,,,......,,,,,,,,,,....,,,,,,,,..#',
  '#..,,,,,,,,....,,,,,,,,,,......,,,,,,,,,,....,,,,,,,,..#',
  '#..,,,,,,,,....,,,,,,,,,,......,,,,,,,,,,....,,,,,,,,..#',
  '#......................................................#',
  '#.........................~~~~.........................#',
  '#.........................~~~~.........................#',
  '#......................................................#',
  '#......................................................#',
  '#.........,,,.TT,,,,,,,,,,TTTT,,,,,,,,,,TT.,,,.........#',
  '#.,,,,,...,,,.T,,,,,,,,,,,,TT,,,,,,,,,,,,T.,,,...,,,,,.#',
  '#.,,,,,...,,,.,,,,,,,,,,,,,..,,,,,,,,,,,,,.,,,...,,,,,.#',
  '#.,,,,,.......,,,,~~~,,,,,,..,,,,,,~~~,,,,.......,,,,,.#',
  '#.,,,,,.......,,,,~~~,,,,,,..,,,,,,~~~,,,,.......,,,,,.#',
  '#.,,,,,.......,,,,,,,,,,,,,..,,,,,,,,,,,,,.......,,,,,.#',
  '#...........................$R.........................#',
  '#.........,,,.....TT..............TT.......,,,.........#',
  '#.,,,,,...,,,..............................,,,...,,,,,.#',
  '#.,,,,,...,,,.,,,,,,,,,,,..........,,,,,,,.,,,...,,,,,.#',
  '#.,,,,,.......,,,,,,,,,,,..........,,,,,,,.......,,,,,.#',
  '#.,,,,,.......,,,,,,TT,,,..........,,,TT,,.......,,,,,.#',
  '#.,,,,,.......,,,,,,,,,,,..........,,,,,,,.......,,,,,.#',
  '#...........................@..........................#',
  '#...........................=..........................#',
  '############################E###########################',
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

/** Big trees all over the Forest (Rounds 73 and 78), and a big vine tree (Round 82). */
const FOREST_DECOR: readonly MapDecor[] = [
  { sprite: 'tree-vines', x: 32, y: 6, w: 3, h: 3, scale: 1.6 },
  { sprite: 'tree-big', x: 11, y: 15, w: 2, h: 2 },
  { sprite: 'tree-big', x: 43, y: 15, w: 2, h: 2 },
  { sprite: 'tree-big', x: 21, y: 18, w: 2, h: 2 },
  { sprite: 'tree-big', x: 30, y: 19, w: 2, h: 2 },
  { sprite: 'tree-big', x: 12, y: 2, w: 2, h: 2 },
  { sprite: 'tree-big', x: 26, y: 2, w: 2, h: 2 },
  { sprite: 'tree-big', x: 42, y: 2, w: 2, h: 2 },
  { sprite: 'tree-big', x: 5, y: 7, w: 2, h: 2 },
  { sprite: 'tree-big', x: 48, y: 7, w: 2, h: 2 },
  { sprite: 'tree-big', x: 3, y: 17, w: 2, h: 2 },
  { sprite: 'tree-big', x: 50, y: 17, w: 2, h: 2 },
  { sprite: 'tree-big', x: 3, y: 24, w: 2, h: 2 },
  { sprite: 'tree-big', x: 50, y: 24, w: 2, h: 2 },
];

/**
 * A watering hole in the Desert with giraffes, an elephant and a lion drinking; now and then they
 * lift their heads (designer, Round 79). Scenery only: they block their tiles but aren't monsters.
 */
const WATERING_HOLE: readonly MapDecor[] = [
  { sprite: 'watering-hole', x: 15, y: 7, w: 4, h: 2, scale: 1.1, flat: true },
  { sprite: 'giraffe-drink', alt: 'giraffe-up', x: 14, y: 7, w: 1, h: 1, scale: 2.2, flip: true },
  { sprite: 'giraffe-drink', alt: 'giraffe-up', x: 18, y: 6, w: 1, h: 1, scale: 2.2 },
  { sprite: 'elephant-drink', alt: 'elephant-up', x: 19, y: 8, w: 1, h: 1, scale: 2 },
  { sprite: 'lion-drink', alt: 'lion-up', x: 16, y: 9, w: 1, h: 1, scale: 1.6 },
];

/** Monkeys swinging on the vine tree's vines, holding bananas (Round 82). Scenery: they don't block or battle. */
const FOREST_MONKEYS: readonly MapDecor[] = [
  { sprite: 'monkey-swing', x: 31, y: 5, w: 1, h: 2, scale: 1.25, swing: true },
  { sprite: 'monkey-swing', x: 35, y: 5, w: 1, h: 2, scale: 1.25, swing: true, flip: true },
];

/** Old skeletons poking out of the Desert sand (Rounds 74 and 78). */
const DESERT_DECOR: readonly MapDecor[] = [
  ...WATERING_HOLE,
  { sprite: 'skeleton', x: 37, y: 18, w: 3, h: 2 },
  { sprite: 'skeleton', x: 11, y: 2, w: 3, h: 2 },
  { sprite: 'skeleton', x: 41, y: 2, w: 3, h: 2 },
  { sprite: 'skeleton', x: 5, y: 7, w: 3, h: 2 },
  { sprite: 'skeleton', x: 47, y: 7, w: 3, h: 2 },
  { sprite: 'skeleton', x: 26, y: 2, w: 3, h: 2 },
];

/** Little glaciers in the Snowy map (Rounds 75 and 78), and a big one in the middle with a Dumble frozen inside (Round 81, scenery only). */
const SNOWY_DECOR: readonly MapDecor[] = [
  { sprite: 'glacier-dumble', x: 31, y: 6, w: 3, h: 3, scale: 1.4 },
  { sprite: 'glacier', x: 10, y: 15, w: 2, h: 2 },
  { sprite: 'glacier', x: 44, y: 15, w: 2, h: 2 },
  { sprite: 'glacier', x: 10, y: 22, w: 2, h: 2 },
  { sprite: 'glacier', x: 44, y: 22, w: 2, h: 2 },
  { sprite: 'glacier', x: 12, y: 2, w: 2, h: 2 },
  { sprite: 'glacier', x: 42, y: 2, w: 2, h: 2 },
  { sprite: 'glacier', x: 5, y: 7, w: 2, h: 2 },
  { sprite: 'glacier', x: 48, y: 7, w: 2, h: 2 },
  { sprite: 'glacier', x: 3, y: 17, w: 2, h: 2 },
  { sprite: 'glacier', x: 50, y: 17, w: 2, h: 2 },
];

/** Big volcanoes in the Volcano map (Rounds 72 and 78), and a dragon by the lava that breathes fire now and then (Round 83, scenery only). */
const VOLCANO_DECOR: readonly MapDecor[] = [
  { sprite: 'dragon', alt: 'dragon-fire', x: 31, y: 7, w: 3, h: 2, scale: 1.8 },
  { sprite: 'volcano-big', x: 10, y: 15, w: 3, h: 2 },
  { sprite: 'volcano-big', x: 43, y: 15, w: 3, h: 2 },
  { sprite: 'volcano-big', x: 11, y: 2, w: 3, h: 2 },
  { sprite: 'volcano-big', x: 41, y: 2, w: 3, h: 2 },
  { sprite: 'volcano-big', x: 5, y: 7, w: 3, h: 2 },
  { sprite: 'volcano-big', x: 47, y: 7, w: 3, h: 2 },
];

/** Big palm trees on the Beach (Rounds 65 and 78), with fallen coconuts beside them (coconuts don't block). */
const BEACH_PALMS: readonly MapDecor[] = [
  { sprite: 'palm-big', x: 11, y: 15, w: 2, h: 2 },
  { sprite: 'palm-big', x: 43, y: 15, w: 2, h: 2 },
  { sprite: 'palm-big', x: 12, y: 2, w: 2, h: 2 },
  { sprite: 'palm-big', x: 42, y: 2, w: 2, h: 2 },
  { sprite: 'palm-big', x: 5, y: 7, w: 2, h: 2 },
  { sprite: 'palm-big', x: 44, y: 7, w: 2, h: 2 },
  { sprite: 'palm-big', x: 3, y: 24, w: 2, h: 2 },
  { sprite: 'palm-big', x: 44, y: 24, w: 2, h: 2 },
];
const BEACH_COCONUTS: readonly MapDecor[] = [
  { sprite: 'coconut', x: 10, y: 16, w: 1, h: 1 },
  { sprite: 'coconut', x: 13, y: 16, w: 1, h: 1 },
  { sprite: 'coconut', x: 42, y: 16, w: 1, h: 1 },
  { sprite: 'coconut', x: 45, y: 16, w: 1, h: 1 },
  { sprite: 'coconut', x: 11, y: 3, w: 1, h: 1 },
  { sprite: 'coconut', x: 14, y: 3, w: 1, h: 1 },
  { sprite: 'coconut', x: 41, y: 3, w: 1, h: 1 },
  { sprite: 'coconut', x: 44, y: 3, w: 1, h: 1 },
  { sprite: 'coconut', x: 4, y: 8, w: 1, h: 1 },
  { sprite: 'coconut', x: 7, y: 8, w: 1, h: 1 },
  { sprite: 'coconut', x: 43, y: 8, w: 1, h: 1 },
  { sprite: 'coconut', x: 43, y: 7, w: 1, h: 1 },
  { sprite: 'coconut', x: 2, y: 25, w: 1, h: 1 },
  { sprite: 'coconut', x: 5, y: 25, w: 1, h: 1 },
  { sprite: 'coconut', x: 43, y: 25, w: 1, h: 1 },
  { sprite: 'coconut', x: 43, y: 24, w: 1, h: 1 },
];

/** The Beach's right side is the ocean (Round 84): from this column to the wall. */
const OCEAN_FROM = 46;
/** Rows with the ocean on the right: every tile from OCEAN_FROM to the wall becomes water. */
function withOcean(rows: readonly string[], from: number): readonly string[] {
  return rows.map((r, y) => (y === 0 || y === rows.length - 1 ? r : r.slice(0, from) + '~'.repeat(r.length - 1 - from) + r.slice(-1)));
}

/** Crabs walking out of the sea and back, and fish jumping (Round 84). Scenery: no battles. */
const BEACH_SEA_LIFE: readonly MapDecor[] = [
  { sprite: 'beach-crab', x: 47, y: 9, w: 1, h: 1, scale: 0.9, shuttle: [-3, 0] },
  { sprite: 'beach-crab', x: 47, y: 13, w: 1, h: 1, scale: 0.9, shuttle: [-4, 0] },
  { sprite: 'beach-crab', x: 47, y: 18, w: 1, h: 1, scale: 0.9, shuttle: [-3, 0] },
  { sprite: 'beach-crab', x: 47, y: 22, w: 1, h: 1, scale: 0.9, shuttle: [-4, 0] },
  { sprite: 'fish', x: 49, y: 4, w: 2, h: 2, scale: 0.5, jump: true },
  { sprite: 'fish', x: 52, y: 9, w: 2, h: 2, scale: 0.5, jump: true },
  { sprite: 'fish', x: 48, y: 15, w: 2, h: 2, scale: 0.5, jump: true },
  { sprite: 'fish', x: 51, y: 20, w: 2, h: 2, scale: 0.5, jump: true },
  { sprite: 'fish', x: 53, y: 24, w: 2, h: 2, scale: 0.5, jump: true },
  { sprite: 'fish', x: 50, y: 12, w: 2, h: 2, scale: 0.5, jump: true },
];

// Colors: the chosen palette rows in 06-Art-and-Audio/Art-Mockups.html section 5 (owner, 2026-11-21).
// Forest and Beach kept their colors; Desert, Snowy and Volcano use the brighter rows.
export const BIOME_MAPS: readonly GameMap[] = [
  // Tall grass, trees, a pond.
  biome('forest', 'Forest', { ground: 0x7cb35a, path: 0xb89c6a, encounter: 0x3f8f3a, wall: 0x2f4f2f, blocker: 0x1f5a24, water: 0x3b7dd8 }, withBigDecor(BIOME_ROWS, FOREST_DECOR), [...FOREST_DECOR, ...FOREST_MONKEYS]),
  // Soft sand, palm trees, tide pools.
  biome('beach', 'Beach', { ground: 0xf1e7c6, path: 0xd8c08c, encounter: 0xe2c16a, wall: 0x8a6d3b, blocker: 0x4f9a4a, water: 0x2e86c1 }, withBigDecor(withOcean(BIOME_ROWS, OCEAN_FROM), BEACH_PALMS), [...BEACH_PALMS, ...BEACH_COCONUTS, ...BEACH_SEA_LIFE]),
  // Dunes, cactus, quicksand.
  biome('desert', 'Desert', { ground: 0xf6d77e, path: 0xd9a24e, encounter: 0xf0a830, wall: 0xb5652a, blocker: 0x3fae4a, water: 0xc88a4a }, withBigDecor(BIOME_ROWS, DESERT_DECOR), DESERT_DECOR),
  // Deep snow, pine trees, ice.
  biome('snowy', 'Snowy', { ground: 0xf4f8fb, path: 0xb9d4f0, encounter: 0x8fc3f2, wall: 0x2f5f9e, blocker: 0x1f7a4f, water: 0x4fb3f5 }, withBigDecor(BIOME_ROWS, SNOWY_DECOR), SNOWY_DECOR),
  // Ash, rocks, lava.
  biome('volcano', 'Volcano', { ground: 0x5a3430, path: 0x8f4f36, encounter: 0xa8746a, wall: 0x2a1414, blocker: 0x3a2020, water: 0xff4a1a }, withBigDecor(BIOME_ROWS, VOLCANO_DECOR), VOLCANO_DECOR),
];

export const MAPS: readonly GameMap[] = [ANSONVILLE, ...BIOME_MAPS];

/** Where each gate is, by biome (cached per map). */
const gateSpots = new WeakMap<GameMap, { biome: string; x: number; y: number }[]>();
function gatesOf(map: GameMap): { biome: string; x: number; y: number }[] {
  let list = gateSpots.get(map);
  if (!list) {
    list = [];
    for (const [ch, biome] of Object.entries(map.gates ?? {}))
      map.rows.forEach((row, y) => {
        const x = row.indexOf(ch);
        if (x >= 0) list!.push({ biome, x, y });
      });
    gateSpots.set(map, list);
  }
  return list;
}

/** Which biome's area a tile of a zoned map belongs to: the one whose gate is nearest (Round 80). Null on other maps. */
export function zoneAt(map: GameMap, x: number, y: number): string | null {
  if (!map.zoned) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const g of gatesOf(map)) {
    const d = (g.x - x) ** 2 + (g.y - y) ** 2;
    if (d < bestD) [best, bestD] = [g.biome, d];
  }
  return best;
}

/** The colors for one tile: its area's biome colors on a zoned map (paths keep the town's color), else the map's own. */
export function paletteAt(map: GameMap, x: number, y: number): Palette {
  const zone = zoneAt(map, x, y);
  const biomeMap = zone ? BIOME_MAPS.find((m) => m.id === zone) : undefined;
  return biomeMap ? { ...biomeMap.palette, path: map.palette.path } : map.palette;
}

export function mapById(id: string): GameMap {
  const map = MAPS.find((m) => m.id === id);
  if (!map) throw new Error(`No map with id "${id}"`);
  return map;
}
