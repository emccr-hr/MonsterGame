// Save and load (Development Plan M2): JSON with a version number and a migration hook.
// The storage itself (localStorage, export file) lives in src/state; this only converts.
import { z } from 'zod';
import type { GameState } from './game.ts';

export const SAVE_VERSION = 1;

const monster = z.object({
  uid: z.number().int(),
  species: z.string(),
  level: z.number().int().min(1),
  xp: z.number().int().min(0),
  hp: z.number().int().min(0),
  big: z.boolean(),
  moves: z.array(z.string()),
  burned: z.number().int().min(0),
});

const gameState = z.object({
  gems: z.number().int().min(0),
  bag: z.record(z.string(), z.number().int().min(0)),
  team: z.array(monster),
  backpack: z.array(monster),
  seen: z.array(z.string()),
  caught: z.array(z.string()),
  caughtBig: z.array(z.string()),
  openBiomes: z.array(z.string()),
  lastReviver: z.string(),
  pins: z.array(z.object({ id: z.number().int(), scene: z.string(), x: z.number(), y: z.number() })),
  avatarBeaten: z.boolean(),
  nextUid: z.number().int().min(1),
  rngState: z.number().int(),
  area: z.string(),
  tile: z.object({ x: z.number().int(), y: z.number().int() }).nullable(),
  seenTips: z.array(z.string()),
});

/** Old save shape → next version. Add one step per version bump: MIGRATIONS[1] turns v1 into v2. */
export const MIGRATIONS: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {};

export function serialize(state: GameState): string {
  return JSON.stringify({ version: SAVE_VERSION, state });
}

export type LoadResult = { ok: true; state: GameState } | { ok: false; reason: string };

export function deserialize(text: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "This save file can't be read." };
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false, reason: "This save file can't be read." };
  let { version, state } = parsed as { version?: unknown; state?: unknown };
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'This save file has no version.' };
  }
  if (version > SAVE_VERSION) return { ok: false, reason: 'This save is from a newer version of the game.' };
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return { ok: false, reason: `No way to update a version ${version} save.` };
    state = step(state as Record<string, unknown>);
    version++;
  }
  const checked = gameState.safeParse(state);
  return checked.success ? { ok: true, state: checked.data } : { ok: false, reason: 'This save file is damaged.' };
}
