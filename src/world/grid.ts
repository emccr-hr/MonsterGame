// Reading the character-grid maps in src/data/maps. Plain TypeScript (no Phaser), so it is unit tested.
// This is map plumbing, not game rules: rules stay in src/logic (ADR 0002).
import type { GameMap } from '../data/maps';

export interface Tile {
  x: number;
  y: number;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

export const STEP: Readonly<Record<Dir, Tile>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export type TileKind =
  | 'wall'
  | 'ground'
  | 'path'
  | 'encounter'
  | 'blocker'
  | 'water'
  | 'shop'
  | 'reviver'
  | 'guide'
  | 'arena'
  | 'arenaGate'
  | 'exit'
  | 'gate';

const LEGEND: Readonly<Record<string, TileKind>> = {
  '#': 'wall',
  '.': 'ground',
  '@': 'ground',
  '=': 'path',
  ',': 'encounter',
  T: 'blocker',
  '~': 'water',
  $: 'shop',
  R: 'reviver',
  G: 'guide',
  a: 'arena',
  A: 'arenaGate',
  E: 'exit',
};

export function width(map: GameMap): number {
  return map.rows[0]?.length ?? 0;
}

export function height(map: GameMap): number {
  return map.rows.length;
}

/** The character at a tile; outside the map counts as wall. */
export function charAt(map: GameMap, t: Tile): string {
  return map.rows[t.y]?.[t.x] ?? '#';
}

export function kindOf(ch: string): TileKind | undefined {
  if (/^[1-9]$/.test(ch)) return 'gate';
  return LEGEND[ch];
}

export function kindAt(map: GameMap, t: Tile): TileKind {
  return kindOf(charAt(map, t)) ?? 'wall';
}

/** Tiles the player can stand on. Everything else blocks, and some blocking tiles react to a bump. */
export function isWalkable(kind: TileKind): boolean {
  return kind === 'ground' || kind === 'path' || kind === 'encounter';
}

export function add(t: Tile, dir: Dir): Tile {
  return { x: t.x + STEP[dir].x, y: t.y + STEP[dir].y };
}

export function findAll(map: GameMap, ch: string): Tile[] {
  const out: Tile[] = [];
  map.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === ch) out.push({ x, y });
  });
  return out;
}

/** The '@' tile. */
export function startTile(map: GameMap): Tile {
  const [start] = findAll(map, '@');
  if (!start) throw new Error(`Map "${map.id}" has no start tile (@)`);
  return start;
}

/** The gate tile that leads to a biome, if this map has one. */
export function gateTile(map: GameMap, biomeId: string): Tile | undefined {
  const ch = Object.entries(map.gates ?? {}).find(([, id]) => id === biomeId)?.[0];
  return ch ? findAll(map, ch)[0] : undefined;
}

/** The biome a gate character leads to. */
export function gateBiome(map: GameMap, ch: string): string | undefined {
  return map.gates?.[ch];
}

/** Where to put the player beside a gate or exit: the first walkable neighbor (down, right, left, up). */
export function besideTile(map: GameMap, t: Tile): Tile {
  for (const dir of ['down', 'right', 'left', 'up'] as const) {
    const n = add(t, dir);
    if (isWalkable(kindAt(map, n))) return n;
  }
  throw new Error(`Map "${map.id}": nothing walkable beside (${t.x}, ${t.y})`);
}

export const key = (t: Tile): string => `${t.x},${t.y}`;

/** Every walkable tile the player can reach from `from` (for tests and map checks). */
export function reachable(map: GameMap, from: Tile): Set<string> {
  const seen = new Set<string>([key(from)]);
  const queue: Tile[] = [from];
  while (queue.length) {
    const t = queue.shift() as Tile;
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      const n = add(t, dir);
      if (!seen.has(key(n)) && isWalkable(kindAt(map, n))) {
        seen.add(key(n));
        queue.push(n);
      }
    }
  }
  return seen;
}

/** True if the player can walk up to (stand next to) this tile from `from`. */
export function canReach(map: GameMap, from: Tile, target: Tile): boolean {
  const seen = reachable(map, from);
  return (['up', 'down', 'left', 'right'] as const).some((d) => seen.has(key(add(target, d))));
}
