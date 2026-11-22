// The one game in play (M4): the M2 GameState held for the scenes, plus saving it to localStorage.
// Rules live in src/logic; this file only keeps the current state and reads and writes the save.
import { SAVE_KEY } from '../config';
import { content } from '../data';
import { newGame, type GameState } from '../logic/game';
import { createRng, type Rng } from '../logic/rng';
import { deserialize, serialize } from '../logic/save';

let current: GameState | null = null;

/**
 * Test-only seed: `?seed=123` in the address makes the game's dice repeat (smoke tests).
 * Without it, the time is the seed.
 */
export function testSeed(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  return Number(raw) >>> 0;
}

export const freshSeed = (): number => testSeed() ?? Date.now() >>> 0;

/** The game in play, or null before New Game / Continue. */
export function currentGame(): GameState | null {
  return current;
}

/** The game in play. Throws if none has started (a scene bug). */
export function getGame(): GameState {
  if (!current) throw new Error('No game in play');
  return current;
}

export function setGame(state: GameState | null): void {
  current = state;
}

export function startGame(firstBiome: string): GameState {
  current = newGame(content, firstBiome, freshSeed());
  return current;
}

/** Dice for one encounter, continuing the saved sequence. Store `rng.getState()` back after. */
export function gameRng(): Rng {
  return createRng(getGame().rngState);
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null; // Private mode or storage blocked.
  }
}

/** Writes the game to localStorage. Quietly does nothing if storage is blocked. */
export function saveGame(): void {
  if (!current) return;
  try {
    storage()?.setItem(SAVE_KEY, serialize(current));
  } catch {
    // Storage full or blocked: the game keeps going without a save.
  }
}

export function hasSave(): boolean {
  try {
    return (storage()?.getItem(SAVE_KEY) ?? null) !== null;
  } catch {
    return false;
  }
}

/** Loads the saved game into play. Returns why it failed, or null when it worked. */
export function loadGame(): string | null {
  const text = storage()?.getItem(SAVE_KEY) ?? null;
  if (text === null) return 'There is no saved game.';
  const result = deserialize(text);
  if (!result.ok) return result.reason;
  current = result.state;
  return null;
}
