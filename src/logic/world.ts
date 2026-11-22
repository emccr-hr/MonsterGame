// Shops, map parts, healing, the Avatar gate, and teleporting
// (Progression-and-Economy.md, Mechanics.md "Revivers", "Teleporting", Monster-List.md "Center gate").
import type { Content, Item } from '../data/schema.ts';
import { fail, ok, replaceMonster, type GameState, type Pin, type Result } from './game.ts';
import { maxHp, type MonsterInstance } from './monster.ts';
import type { Rng } from './rng.ts';

export const AVATAR_ARENA = 'avatar-arena';

function item(content: Content, id: string): Item {
  const it = content.items.find((i) => i.id === id);
  if (!it) throw new Error(`Unknown item "${id}"`);
  return it;
}

const count = (state: GameState, id: string) => state.bag[id] ?? 0;
const withBag = (state: GameState, id: string, delta: number): GameState => ({
  ...state,
  bag: { ...state.bag, [id]: count(state, id) + delta },
});

/** Buy `qty` of an item. Map parts are bought with buyMapPart instead (they open a biome right away). */
export function buy(content: Content, state: GameState, itemId: string, qty = 1): Result<GameState> {
  const it = item(content, itemId);
  if (it.effect.kind === 'mapPart') return fail('Pick which part of the map to open.');
  if (!Number.isInteger(qty) || qty < 1) return fail('Buy at least one.');
  const cost = it.price * qty;
  if (state.gems < cost) return fail(`You need ${cost} Magic Gems. You have ${state.gems}.`);
  return ok(withBag({ ...state, gems: state.gems - cost }, itemId, qty));
}

/** Biomes still hidden. */
export const lockedBiomes = (content: Content, state: GameState): string[] =>
  content.biomes.map((b) => b.id).filter((id) => !state.openBiomes.includes(id));

/** Buying a map part opens that biome (designer, Round 61). */
export function buyMapPart(content: Content, state: GameState, biomeId: string): Result<GameState> {
  const part = content.items.find((i) => i.effect.kind === 'mapPart');
  if (!part) throw new Error('items.json has no map part');
  if (!content.biomes.some((b) => b.id === biomeId)) return fail('There is no such place.');
  if (state.openBiomes.includes(biomeId)) return fail('That part of the map is already open.');
  if (state.gems < part.price) return fail(`You need ${part.price} Magic Gems. You have ${state.gems}.`);
  return ok({ ...state, gems: state.gems - part.price, openBiomes: [...state.openBiomes, biomeId] });
}

export function addGems(state: GameState, amount: number): GameState {
  return { ...state, gems: state.gems + Math.max(0, Math.floor(amount)) };
}

/** Gems for winning a wild battle: a random amount in the rules' range. */
export const wildBattleGems = (content: Content, rng: Rng): number =>
  rng.int(content.rules.gemsPerWin.wild.min, content.rules.gemsPerWin.wild.max);

// ---- Healing -------------------------------------------------------------------------------

/** Reviver: full HP for every monster, knocked-out ones wake up, Burned cleared. Free. */
export function useReviver(content: Content, state: GameState, where: string): GameState {
  const heal = (m: MonsterInstance): MonsterInstance => ({ ...m, hp: maxHp(content, m), burned: 0 });
  return { ...state, team: state.team.map(heal), backpack: state.backpack.map(heal), lastReviver: where };
}

/** Use a healing item from the bag on one team monster (outside or inside battle). */
export function useHealingItem(content: Content, state: GameState, itemId: string, uid: number): Result<GameState> {
  const it = item(content, itemId);
  if (count(state, itemId) < 1) return fail(`You don't have a ${it.name}.`);
  const m = state.team.find((x) => x.uid === uid);
  if (!m) return fail('Pick a monster on your team.');
  const max = maxHp(content, m);
  let healed: MonsterInstance;
  if (it.effect.kind === 'heal') {
    if (m.hp <= 0) return fail(`${it.name} can't wake up a knocked-out monster.`);
    if (m.hp >= max) return fail('That monster already has full HP.');
    healed = { ...m, hp: Math.min(max, m.hp + it.effect.hp) };
  } else if (it.effect.kind === 'revive') {
    if (m.hp > 0) return fail('That monster is awake already.');
    healed = { ...m, hp: Math.max(1, Math.floor(max * it.effect.fraction)) };
  } else {
    return fail(`${it.name} doesn't heal.`);
  }
  return ok(withBag(replaceMonster(state, healed), itemId, -1));
}

// ---- Avatar gate ---------------------------------------------------------------------------

/** Every wild monster (base form) must be caught at least once (designer, Rounds 50 and 52). */
export function gateProgress(content: Content, state: GameState): { caught: number; needed: number; open: boolean } {
  const wild = content.monsters.filter((m) => m.kind === 'monster' && m.spawnWeight !== null).map((m) => m.id);
  const caught = wild.filter((id) => state.caught.includes(id)).length;
  return { caught, needed: wild.length, open: caught === wild.length };
}

// ---- Teleporting ---------------------------------------------------------------------------

function pinItem(content: Content) {
  const it = content.items.find((i) => i.effect.kind === 'teleportPin');
  if (!it || it.effect.kind !== 'teleportPin') throw new Error('items.json has no teleport pin');
  return { id: it.id, ...it.effect };
}

/** Teleporting unlocks when any team monster reaches the pin's level (50). */
export function canTeleport(content: Content, state: GameState): boolean {
  return state.team.some((m) => m.level >= pinItem(content).minLevel);
}

/** Teleport spots: Ansonville's shop, every open biome's shop, and placed pins. */
export function teleportSpots(content: Content, state: GameState): { shops: string[]; pins: Pin[] } {
  if (!canTeleport(content, state)) return { shops: [], pins: [] };
  return { shops: ['ansonville', ...state.openBiomes], pins: state.pins };
}

export function placePin(content: Content, state: GameState, scene: string, x: number, y: number): Result<GameState> {
  const pin = pinItem(content);
  if (!canTeleport(content, state)) return fail(`Pins work once a monster on your team is level ${pin.minLevel}.`);
  if (count(state, pin.id) < 1) return fail('You need a Teleport Pin. Buy one at a shop.');
  if (state.pins.length >= pin.maxPlaced) return fail(`You can place ${pin.maxPlaced} pins. Pick one up first.`);
  if (scene === AVATAR_ARENA) return fail("Pins can't go in Avatar's arena.");
  const id = state.pins.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  return ok(withBag({ ...state, pins: [...state.pins, { id, scene, x, y }] }, pin.id, -1));
}

/** Deleting a pin gives it back to the bag (agreed, Round 58). */
export function removePin(content: Content, state: GameState, pinId: number): Result<GameState> {
  if (!state.pins.some((p) => p.id === pinId)) return fail('There is no pin there.');
  return ok(withBag({ ...state, pins: state.pins.filter((p) => p.id !== pinId) }, pinItem(content).id, 1));
}
