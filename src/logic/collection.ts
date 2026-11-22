// Team, Backpack, Monster Book and evolving (M5; Mechanics.md "Team and backpack", UI-and-HUD.md).
// Plain functions over GameState, so the screens only draw what these return.
import type { Content } from '../data/schema.ts';
import { fail, ok, replaceMonster, type GameState, type Result } from './game.ts';
import { addXp, evolutionFor, evolve, xpToNext } from './growth.ts';
import { isKnockedOut, maxHp, species, type MonsterInstance } from './monster.ts';
import { gateProgress } from './world.ts';

/** "Bushtail  Lv 12  30/41 HP" (and a star for a Big Monster, "asleep" when knocked out). */
export function monsterLine(content: Content, m: MonsterInstance): string {
  const s = species(content, m.species);
  const hp = isKnockedOut(m) ? 'knocked out' : `${m.hp}/${maxHp(content, m)} HP`;
  return `${m.big ? '★ ' : ''}${s.name}  Lv ${m.level}  ${hp}`;
}

/** Swaps two team slots (the first slot leads in battle). */
export function swapTeamSlots(state: GameState, a: number, b: number): Result<GameState> {
  if (!state.team[a] || !state.team[b]) return fail('Pick two monsters on your team.');
  const team = [...state.team];
  [team[a], team[b]] = [team[b]!, team[a]!];
  return ok({ ...state, team });
}

export type BackpackSort = 'caught' | 'name' | 'level' | 'biome';
export const BACKPACK_SORTS: BackpackSort[] = ['caught', 'name', 'level', 'biome'];

/** The backpack in display order. "caught" is the order you caught them in. */
export function sortedBackpack(content: Content, list: MonsterInstance[], by: BackpackSort): MonsterInstance[] {
  const name = (m: MonsterInstance) => species(content, m.species).name;
  const biome = (m: MonsterInstance) => species(content, m.species).biome ?? '';
  const sorted = [...list];
  if (by === 'name') sorted.sort((a, b) => name(a).localeCompare(name(b)) || b.level - a.level);
  if (by === 'level') sorted.sort((a, b) => b.level - a.level || name(a).localeCompare(name(b)));
  if (by === 'biome') sorted.sort((a, b) => biome(a).localeCompare(biome(b)) || name(a).localeCompare(name(b)));
  return sorted;
}

// ---- Evolving ------------------------------------------------------------------------------

/** Team and backpack monsters that are at their evolve level now. */
export function readyToEvolve(content: Content, state: GameState): MonsterInstance[] {
  return [...state.team, ...state.backpack].filter((m) => evolutionFor(content, m) !== null);
}

/**
 * Debug only (dev builds, the L key): each team monster levels up to its evolve level, or 5 more
 * levels if it is fully grown. Lets a play-test reach evolving quickly.
 */
export function debugLevelTeam(content: Content, state: GameState): GameState {
  let next = state;
  for (const m of state.team) {
    const target = Math.min(content.rules.levelCap, species(content, m.species).evolvesTo?.level ?? m.level + 5);
    let grown = m;
    while (grown.level < target) grown = addXp(content, grown, xpToNext(grown.level) - grown.xp).monster;
    next = replaceMonster(next, grown);
  }
  return next;
}

/** Evolves one monster; the Monster Book counts the new form as caught. */
export function evolveMonster(
  content: Content,
  state: GameState,
  uid: number,
): { ok: true; state: GameState; from: MonsterInstance; to: MonsterInstance } | { ok: false; reason: string } {
  const m = [...state.team, ...state.backpack].find((x) => x.uid === uid);
  if (!m) return { ok: false, reason: 'That monster is not yours.' };
  if (!evolutionFor(content, m)) return { ok: false, reason: `${species(content, m.species).name} isn't ready to grow yet.` };
  const to = evolve(content, m);
  return { ok: true, state: replaceMonster(state, to), from: m, to };
}

// ---- Monster Book --------------------------------------------------------------------------

export type BookStatus = 'unseen' | 'seen' | 'caught';

export interface BookEntry {
  id: string;
  /** "???" until seen. */
  name: string;
  biome: string | null;
  status: BookStatus;
  /** Caught as a Big Monster at least once. */
  big: boolean;
  /** Spawns in the wild (counts toward the Avatar gate); false for evolved forms. */
  wild: boolean;
  /** The look line once seen, or a hint about where to find it. */
  text: string;
}

/** Every monster except Avatar, in the order of monsters.json (families stay together). */
export function bookEntries(content: Content, state: GameState): BookEntry[] {
  return content.monsters
    .filter((m) => m.kind === 'monster')
    .map((m) => {
      const status: BookStatus = state.caught.includes(m.id) ? 'caught' : state.seen.includes(m.id) ? 'seen' : 'unseen';
      const wild = m.spawnWeight !== null;
      const biomeName = content.biomes.find((b) => b.id === m.biome)?.name ?? '';
      const from = m.evolvesFrom ? species(content, m.evolvesFrom).name : null;
      const hint = wild ? `Lives in the ${biomeName}.` : from && state.seen.includes(m.evolvesFrom!) ? `Grows from ${from}.` : 'Grows from another monster.';
      return {
        id: m.id,
        name: status === 'unseen' ? '???' : m.name,
        biome: m.biome,
        status,
        big: state.caughtBig.includes(m.id),
        wild,
        text: status === 'unseen' ? hint : m.look,
      };
    });
}

/** The Book's counters: species seen and caught, and the Avatar gate ("Wild monsters caught: X / 15"). */
export function bookSummary(content: Content, state: GameState): { seen: number; caught: number; total: number; gate: { caught: number; needed: number; open: boolean } } {
  const entries = bookEntries(content, state);
  return {
    seen: entries.filter((e) => e.status !== 'unseen').length,
    caught: entries.filter((e) => e.status === 'caught').length,
    total: entries.length,
    gate: gateProgress(content, state),
  };
}

// ---- Using items outside battle ------------------------------------------------------------

/** Healing items in the bag (Potion, Wake-Up Snack) with how many you have. */
export function healingItems(content: Content, state: GameState): { id: string; name: string; count: number; description: string }[] {
  return content.items
    .filter((it) => (it.effect.kind === 'heal' || it.effect.kind === 'revive') && (state.bag[it.id] ?? 0) > 0)
    .map((it) => ({ id: it.id, name: it.name, count: state.bag[it.id] ?? 0, description: it.description }));
}

/** Why this item can't go to this monster, or null if it can. Same rules in and out of battle. */
export function itemTargetProblem(content: Content, itemId: string, m: MonsterInstance): string | null {
  const it = content.items.find((i) => i.id === itemId);
  if (!it) return 'Pick an item.';
  if (it.effect.kind === 'heal') {
    if (isKnockedOut(m)) return `${it.name} can't wake up a knocked-out monster.`;
    if (m.hp >= maxHp(content, m)) return 'That monster already has full HP.';
    return null;
  }
  if (it.effect.kind === 'revive') return isKnockedOut(m) ? null : 'That monster is awake already.';
  return "You can't use that here.";
}
