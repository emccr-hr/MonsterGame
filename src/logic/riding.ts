// Riding starred Big monsters (designer, Round 88): pick one on the Team screen and choose Ride.
// Riding is faster than walking, and a Big monster from the swim biome (the Beach) carries you over water.
import type { Content } from '../data/schema.ts';
import { fail, ok, type GameState, type Result } from './game.ts';
import { species, type MonsterInstance } from './monster.ts';

/** Only starred Big monsters can be ridden (the designer's pick). */
export const canRide = (m: Pick<MonsterInstance, 'big'>): boolean => m.big;

/** A Big monster from the swim biome can carry you across water. */
export function canSwim(content: Content, m: Pick<MonsterInstance, 'big' | 'species'>): boolean {
  return m.big && species(content, m.species).biome === content.rules.ride.swimBiome;
}

/** The monster being ridden, or null (also null if it is no longer in the team or backpack). */
export function ridingMonster(state: GameState): MonsterInstance | null {
  if (state.riding === null) return null;
  return [...state.team, ...state.backpack].find((m) => m.uid === state.riding) ?? null;
}

/** Get on a monster (team or backpack). Riding another one first means you switch. */
export function startRide(content: Content, state: GameState, uid: number): Result<GameState> {
  const m = [...state.team, ...state.backpack].find((x) => x.uid === uid);
  if (!m) return fail('That monster is not with you.');
  const name = species(content, m.species).name;
  if (!canRide(m)) return fail(`Only Big monsters (with a star) can be ridden. ${name} is too small!`);
  return ok({ ...state, riding: uid });
}

/** Get off. Not while swimming: you'd fall in the water! */
export function stopRide(state: GameState, onWater: boolean): Result<GameState> {
  if (state.riding === null) return fail("You aren't riding anything.");
  if (onWater) return fail("You can't get off in the water! Ride back to land first.");
  return ok({ ...state, riding: null });
}

/** How long one step takes: riding is rules.ride.speed times faster. */
export function stepMs(content: Content, state: GameState, walkMs: number): number {
  return ridingMonster(state) ? Math.round(walkMs / content.rules.ride.speed) : walkMs;
}

/** Can the player stand on water now? Only while riding a swimmer. */
export function canCrossWater(content: Content, state: GameState): boolean {
  const m = ridingMonster(state);
  return !!m && canSwim(content, m);
}
