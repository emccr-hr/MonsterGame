// Visible wild monsters (designer, Round 62): they wander on encounter ground, you can see them
// (and spot a Big one) before you battle, and walking into one starts a battle with exactly that
// monster. Some hidden "surprise" encounters stay, at a lower rate. Plain rules, no Phaser (ADR 0002).
import type { Content } from '../data/schema.ts';
import type { EncounterRate } from './encounterRate.ts';
import type { Rng } from './rng.ts';
import { rollSpawn, type Spawn } from './spawning.ts';

export interface Tile {
  x: number;
  y: number;
}

/** A wild monster on the map. */
export interface Walker {
  id: number;
  spawn: Spawn;
  tile: Tile;
}

/** Proposed numbers (Decisions-Log, 2026-11-22); tune after play-testing. */
export const WALKERS = {
  /** How many wander on a biome map at once. */
  perMap: 5,
  /** Each one tries a step every this many ms (random between min and max). */
  stepMs: { min: 1000, max: 2000 },
  /** A new one appears this long after one leaves (battled or caught). */
  respawnMs: 6000,
  /** New ones appear at least this many tiles from the player, so they don't pop up in your face. */
  minSpawnDistance: 4,
} as const;

/** Some surprises stay (Round 62): hidden encounters on top of the visible ones, less often than before. */
export const SURPRISE_ENCOUNTER_RATE: EncounterRate = { chance: 0.04, safeSteps: 5 };

const DIRS: readonly Tile[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

export const sameTile = (a: Tile, b: Tile): boolean => a.x === b.x && a.y === b.y;
const distance = (a: Tile, b: Tile): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Places a new walker on a free encounter tile far enough from the player, or returns null if
 * there's no room. `ground` is every encounter tile on the map; `taken` are tiles already in use.
 */
export function spawnWalker(
  content: Content,
  biome: string,
  teamLevels: readonly number[],
  ground: readonly Tile[],
  taken: readonly Tile[],
  player: Tile,
  id: number,
  rng: Rng,
): Walker | null {
  const free = ground.filter((t) => !taken.some((u) => sameTile(t, u)) && distance(t, player) >= WALKERS.minSpawnDistance);
  if (free.length === 0) return null;
  const tile = free[rng.int(0, free.length - 1)]!;
  return { id, spawn: rollSpawn(content, biome, teamLevels, rng), tile };
}

/**
 * One wander step: a random direction onto a tile `canEnter` allows (encounter ground, not another
 * monster, not the player). Returns the same tile when it stays put (sometimes it just rests).
 */
export function wanderStep(from: Tile, canEnter: (t: Tile) => boolean, rng: Rng): Tile {
  if (rng.chance(0.25)) return from;
  const options = DIRS.map((d) => ({ x: from.x + d.x, y: from.y + d.y })).filter(canEnter);
  if (options.length === 0) return from;
  return options[rng.int(0, options.length - 1)]!;
}

/**
 * How big a wild monster looks on the map, in px: "N x Dumble" squeezed like in battle (so a 4.5x
 * snowman still fits between trees; a 1x one is a bit smaller than a tile), and Big Monsters 1.5x bigger (no star, Round 62).
 */
export function mapSpriteSize(scale: number, big: boolean): number {
  const px = Math.min(64, Math.max(22, 26 * Math.sqrt(scale)));
  return Math.round(px * (big ? 1.5 : 1));
}
