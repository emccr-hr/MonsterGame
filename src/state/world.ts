// The world part of the game state, for the map scenes: which biomes are open, where the player is,
// and which first-time tips they've seen. Since M4 it lives in the M2 GameState (src/state/game.ts),
// so it is saved with everything else. No game rules here.
import { content } from '../data';
import type { GameState } from '../logic/game';
import type { Tile } from '../world/grid';
import { currentGame, setGame, startGame } from './game';

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

const biomeIds = (): string[] => content.biomes.map((b) => b.id);

function assertBiome(id: string): void {
  if (!biomeIds().includes(id)) throw new Error(`Unknown biome "${id}"`);
}

/** Changes the game in play. Does nothing before a game starts. */
function update(change: (g: GameState) => GameState): void {
  const g = currentGame();
  if (g) setGame(change(g));
}

/** A copy of the world state; changing it does nothing. */
export function getWorld(): WorldState {
  const g = currentGame();
  if (!g) return { startBiome: null, openBiomes: [], area: null, tile: null, seenTips: [] };
  return structuredClone({
    startBiome: g.openBiomes[0] ?? null,
    openBiomes: g.openBiomes,
    area: g.area,
    tile: g.tile,
    seenTips: g.seenTips,
  });
}

/** New Game: only Ansonville and the picked biome are open (Mechanics.md, Start of the game). */
export function startNewGame(biomeId: string): void {
  assertBiome(biomeId);
  startGame(biomeId);
}

export function isBiomeOpen(biomeId: string): boolean {
  return currentGame()?.openBiomes.includes(biomeId) ?? false;
}

/** Opens a biome (M6: after buying its map part). Opening an open biome does nothing. */
export function openBiome(biomeId: string): void {
  assertBiome(biomeId);
  update((g) => (g.openBiomes.includes(biomeId) ? g : { ...g, openBiomes: [...g.openBiomes, biomeId] }));
}

/** Debug only (dev builds): opens every biome. */
export function openAllBiomes(): void {
  update((g) => ({ ...g, openBiomes: biomeIds() }));
}

export function setPlayerPosition(area: string, tile: Tile): void {
  update((g) => ({ ...g, area, tile: { x: tile.x, y: tile.y } }));
}

/** Marks a tip as seen. Returns true the first time, so the caller shows it once. */
export function markTipSeen(tipId: string): boolean {
  const g = currentGame();
  if (!g || g.seenTips.includes(tipId)) return false;
  setGame({ ...g, seenTips: [...g.seenTips, tipId] });
  return true;
}

/** Back to "no game started" (tests, and Title in the future). */
export function resetWorld(): void {
  setGame(null);
}
