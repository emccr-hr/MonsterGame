// The whole game state, new game, and team/backpack rules (Mechanics.md "Team and backpack",
// "Start of the game"). Every function returns a new state; nothing is changed in place.
import type { Content } from '../data/schema.ts';
import { createMonster, isKnockedOut, type MonsterInstance } from './monster.ts';

export interface Pin {
  id: number;
  scene: string;
  x: number;
  y: number;
}

export interface GameState {
  gems: number;
  /** Item id → how many. Cages, potions, snacks, unplaced teleport pins. */
  bag: Record<string, number>;
  /** Up to rules.teamSize monsters "at the ready". The first awake one leads in battle. */
  team: MonsterInstance[];
  /** Every other caught monster, no limit. */
  backpack: MonsterInstance[];
  /** Monster Book: species ever seen, caught, and caught as a Big Monster. */
  seen: string[];
  caught: string[];
  caughtBig: string[];
  /** Biomes the player can enter. */
  openBiomes: string[];
  /** Where the player wakes up after losing: the last Reviver used ("ansonville" or a biome id). */
  lastReviver: string;
  pins: Pin[];
  avatarBeaten: boolean;
  nextUid: number;
  /** Saved random-number state, so a loaded game continues the same sequence. */
  rngState: number;
  /** Where the player is: a map id ("ansonville" or a biome id) and a tile (null = the map's start). */
  area: string;
  tile: { x: number; y: number } | null;
  /** Guide tips already shown once. */
  seenTips: string[];
}

export type Result<T> = { ok: true; state: T } | { ok: false; reason: string };
export const ok = <T>(state: T): Result<T> => ({ ok: true, state });
export const fail = <T>(reason: string): Result<T> => ({ ok: false, reason });

/** New game: Ansonville plus the one biome the player picked, 100 cages, 100 gems, no monsters. */
export function newGame(content: Content, firstBiome: string, rngState: number): GameState {
  if (!content.biomes.some((b) => b.id === firstBiome)) throw new Error(`Unknown biome "${firstBiome}"`);
  return {
    gems: content.rules.start.gems,
    bag: { cage: content.rules.start.cages },
    team: [],
    backpack: [],
    seen: [],
    caught: [],
    caughtBig: [],
    openBiomes: [firstBiome],
    lastReviver: 'ansonville',
    pins: [],
    avatarBeaten: false,
    nextUid: 1,
    rngState,
    area: 'ansonville',
    tile: null,
    seenTips: [],
  };
}

const addUnique = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export function markSeen(state: GameState, speciesId: string): GameState {
  return { ...state, seen: addUnique(state.seen, speciesId) };
}

/** A caught monster joins the team if there's room, otherwise goes straight to the backpack. */
export function addCaught(
  content: Content,
  state: GameState,
  wild: Pick<MonsterInstance, 'species' | 'level' | 'big' | 'hp' | 'burned'>,
): { state: GameState; monster: MonsterInstance; toTeam: boolean } {
  const fresh = createMonster(content, wild.species, wild.level, wild.big, state.nextUid);
  const monster: MonsterInstance = { ...fresh, hp: Math.min(wild.hp, fresh.hp), burned: 0 };
  const toTeam = state.team.length < content.rules.teamSize;
  return {
    monster,
    toTeam,
    state: {
      ...state,
      nextUid: state.nextUid + 1,
      team: toTeam ? [...state.team, monster] : state.team,
      backpack: toTeam ? state.backpack : [...state.backpack, monster],
      seen: addUnique(state.seen, monster.species),
      caught: addUnique(state.caught, monster.species),
      caughtBig: monster.big ? addUnique(state.caughtBig, monster.species) : state.caughtBig,
    },
  };
}

/** Records that a monster evolved (the Monster Book counts the new form as caught). */
export function replaceMonster(state: GameState, updated: MonsterInstance): GameState {
  const swap = (list: MonsterInstance[]) => list.map((m) => (m.uid === updated.uid ? updated : m));
  return {
    ...state,
    team: swap(state.team),
    backpack: swap(state.backpack),
    seen: addUnique(state.seen, updated.species),
    caught: addUnique(state.caught, updated.species),
    caughtBig: updated.big ? addUnique(state.caughtBig, updated.species) : state.caughtBig,
  };
}

/** Moves a monster from the backpack onto the team (outside battle). */
export function toTeam(content: Content, state: GameState, uid: number): Result<GameState> {
  const m = state.backpack.find((x) => x.uid === uid);
  if (!m) return fail('That monster is not in your backpack.');
  if (state.team.length >= content.rules.teamSize) return fail('Your team is full. Move one to the backpack first.');
  return ok({ ...state, team: [...state.team, m], backpack: state.backpack.filter((x) => x.uid !== uid) });
}

/** Moves a team monster into the backpack. The team can't be left empty. */
export function toBackpack(state: GameState, uid: number): Result<GameState> {
  const m = state.team.find((x) => x.uid === uid);
  if (!m) return fail('That monster is not on your team.');
  if (state.team.length === 1) return fail('Keep at least one monster on your team.');
  return ok({ ...state, team: state.team.filter((x) => x.uid !== uid), backpack: [...state.backpack, m] });
}

/** Swaps a team monster with a backpack monster in the same team slot. */
export function swapWithBackpack(state: GameState, teamUid: number, backpackUid: number): Result<GameState> {
  const t = state.team.findIndex((x) => x.uid === teamUid);
  const b = state.backpack.findIndex((x) => x.uid === backpackUid);
  if (t < 0 || b < 0) return fail('Pick one team monster and one backpack monster.');
  const team = [...state.team];
  const backpack = [...state.backpack];
  [team[t], backpack[b]] = [backpack[b]!, team[t]!];
  return ok({ ...state, team, backpack });
}

/** Reorders the team so `uid` leads. */
export function setLeader(state: GameState, uid: number): Result<GameState> {
  const m = state.team.find((x) => x.uid === uid);
  if (!m) return fail('That monster is not on your team.');
  return ok({ ...state, team: [m, ...state.team.filter((x) => x.uid !== uid)] });
}

export const awakeTeam = (state: GameState): MonsterInstance[] => state.team.filter((m) => !isKnockedOut(m));
export const teamLevels = (state: GameState): number[] => state.team.map((m) => m.level);
