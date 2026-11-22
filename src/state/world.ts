// The little bit of world state the scenes need (M3): which biomes are open, where the player is,
// and which first-time tips they've seen. No game rules here. The full game state and save file
// come from M2 (src/logic/); when they land, this can move into that store.
import { content } from '../data';
import type { Tile } from '../world/grid';

export interface WorldState {
  /** The biome picked on New Game, or null before a game starts. */
  startBiome: string | null;
  /** Biome ids the player can enter. Ansonville is always open. */
  openBiomes: string[];
  /** Map id the player is on ("ansonville" or a biome id), or null before a game starts. */
  area: string | null;
  tile: Tile | null;
  /** Guide tip ids already shown once. */
  seenTips: string[];
}

const fresh = (): WorldState => ({ startBiome: null, openBiomes: [], area: null, tile: null, seenTips: [] });

let state: WorldState = fresh();

const biomeIds = (): string[] => content.biomes.map((b) => b.id);

function assertBiome(id: string): void {
  if (!biomeIds().includes(id)) throw new Error(`Unknown biome "${id}"`);
}

/** A copy of the world state; changing it does nothing. */
export function getWorld(): WorldState {
  return structuredClone(state);
}

/** New Game: only Ansonville and the picked biome are open (Mechanics.md, Start of the game). */
export function startNewGame(biomeId: string): void {
  assertBiome(biomeId);
  state = { ...fresh(), startBiome: biomeId, openBiomes: [biomeId], area: 'ansonville' };
}

export function isBiomeOpen(biomeId: string): boolean {
  return state.openBiomes.includes(biomeId);
}

/** Opens a biome (M6: after buying its map part). Opening an open biome does nothing. */
export function openBiome(biomeId: string): void {
  assertBiome(biomeId);
  if (!isBiomeOpen(biomeId)) state.openBiomes = [...state.openBiomes, biomeId];
}

/** Debug only (dev builds): opens every biome. */
export function openAllBiomes(): void {
  state.openBiomes = biomeIds();
}

export function setPlayerPosition(area: string, tile: Tile): void {
  state.area = area;
  state.tile = { x: tile.x, y: tile.y };
}

/** Marks a tip as seen. Returns true the first time, so the caller shows it once. */
export function markTipSeen(tipId: string): boolean {
  if (state.seenTips.includes(tipId)) return false;
  state.seenTips = [...state.seenTips, tipId];
  return true;
}

/** Back to "no game started" (tests, and Title in the future). */
export function resetWorld(): void {
  state = fresh();
}
