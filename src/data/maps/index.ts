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
  rows: readonly string[];
  /** Gate character to biome id. */
  gates?: Readonly<Record<string, string>>;
  palette: Palette;
}

export const ANSONVILLE: GameMap = {
  id: 'ansonville',
  name: 'Ansonville',
  biome: null,
  // Layout follows the sketch in 03-World-and-Story/Setting.md: Snowy north, Desert and Volcano
  // up the sides, Forest and Beach down the sides, the Avatar arena in the middle.
  rows: [
    '#################2##################',
    '#TT..............=...............TT#',
    '#T...............=................T#',
    '1===.............=.............====3',
    '#..=.............=.............=...#',
    '#..=============================...#',
    '#........$R......=......G..........#',
    '#................@.................#',
    '#................=.................#',
    '#.............aaaAaaa..............#',
    '#.............aaaaaaa..............#',
    '#.............aaaaaaa..............#',
    '#.............aaaaaaa..............#',
    '#.............aaaaaaa..............#',
    '#..................................#',
    '#..TT..........................TT..#',
    '#..................................#',
    '#==============.......=============#',
    '4==...............................=5',
    '#T................................T#',
    '#TT..............................TT#',
    '####################################',
  ],
  gates: { '1': 'desert', '2': 'snowy', '3': 'volcano', '4': 'forest', '5': 'beach' },
  palette: { ground: 0x8fc46a, path: 0xcfb98a, encounter: 0x8fc46a, wall: 0x4a5a3a, blocker: 0x2f6d2f, water: 0x3b7dd8 },
};

// All five biomes share one layout for now (about one screen each): shop and Reviver by the
// entrance at the bottom, encounter ground around the edges. Different looks come with real art.
const BIOME_ROWS = [
  '##############################',
  '#TT,,,,,,,,,,TTTT,,,,,,,,,,TT#',
  '#T,,,,,,,,,,,,TT,,,,,,,,,,,,T#',
  '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
  '#,,,,~~~,,,,,,..,,,,,,~~~,,,,#',
  '#,,,,~~~,,,,,,..,,,,,,~~~,,,,#',
  '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
  '#............................#',
  '#....TT..............TT......#',
  '#............................#',
  '#,,,,,,,,,,,..........,,,,,,,#',
  '#,,,,,,,,,,,..........,,,,,,,#',
  '#,,,,,,TT,,,..........,,,TT,,#',
  '#,,,,,,,,,,,...$R.....,,,,,,,#',
  '#..............@.............#',
  '#..............=.............#',
  '###############E##############',
] as const;

const biome = (id: string, name: string, palette: Palette): GameMap => ({ id, name, biome: id, rows: BIOME_ROWS, palette });

// Colors: the chosen palette rows in 06-Art-and-Audio/Art-Mockups.html section 5 (owner, 2026-11-21).
// Forest and Beach kept their colors; Desert, Snowy and Volcano use the brighter rows.
export const BIOME_MAPS: readonly GameMap[] = [
  // Tall grass, trees, a pond.
  biome('forest', 'Forest', { ground: 0x7cb35a, path: 0xb89c6a, encounter: 0x3f8f3a, wall: 0x2f4f2f, blocker: 0x1f5a24, water: 0x3b7dd8 }),
  // Soft sand, palm trees, tide pools.
  biome('beach', 'Beach', { ground: 0xf1e7c6, path: 0xd8c08c, encounter: 0xe2c16a, wall: 0x8a6d3b, blocker: 0x4f9a4a, water: 0x2e86c1 }),
  // Dunes, cactus, quicksand.
  biome('desert', 'Desert', { ground: 0xf6d77e, path: 0xd9a24e, encounter: 0xf0a830, wall: 0xb5652a, blocker: 0x3fae4a, water: 0xc88a4a }),
  // Deep snow, pine trees, ice.
  biome('snowy', 'Snowy', { ground: 0xf4f8fb, path: 0xb9d4f0, encounter: 0x8fc3f2, wall: 0x2f5f9e, blocker: 0x1f7a4f, water: 0x4fb3f5 }),
  // Ash, rocks, lava.
  biome('volcano', 'Volcano', { ground: 0x5a3430, path: 0x8f4f36, encounter: 0xa8746a, wall: 0x2a1414, blocker: 0x3a2020, water: 0xff4a1a }),
];

export const MAPS: readonly GameMap[] = [ANSONVILLE, ...BIOME_MAPS];

export function mapById(id: string): GameMap {
  const map = MAPS.find((m) => m.id === id);
  if (!map) throw new Error(`No map with id "${id}"`);
  return map;
}
