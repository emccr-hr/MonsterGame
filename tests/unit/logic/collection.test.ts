import { describe, expect, it } from 'vitest';
import {
  bookEntries,
  bookSummary,
  debugLevelTeam,
  evolveMonster,
  healingItems,
  itemTargetProblem,
  monsterLine,
  readyToEvolve,
  sortedBackpack,
  swapTeamSlots,
} from '../../../src/logic/collection';
import { addCaught, newGame, type GameState } from '../../../src/logic/game';
import { maxHp } from '../../../src/logic/monster';
import { mon, realContent } from '../helpers';

const content = realContent();

function withTeam(...ids: string[]): GameState {
  let s = newGame(content, 'forest', 1);
  for (const id of ids) s = addCaught(content, s, { species: id, level: 5, big: false, hp: 9999, burned: 0 }).state;
  return s;
}

describe('monsterLine', () => {
  it('shows name, level and HP, a star for Big, and "knocked out"', () => {
    const m = mon(content, 'bushtail', 7);
    expect(monsterLine(content, m)).toBe(`Bushtail  Lv 7  ${m.hp}/${maxHp(content, m)} HP`);
    expect(monsterLine(content, { ...m, big: true, hp: 0 })).toBe('★ Bushtail  Lv 7  knocked out');
  });
});

describe('swapTeamSlots', () => {
  it('swaps two team slots, so a new monster can lead', () => {
    const s = withTeam('bushtail', 'peggy');
    const r = swapTeamSlots(s, 0, 1);
    expect(r.ok && r.state.team.map((m) => m.species)).toEqual(['peggy', 'bushtail']);
    expect(swapTeamSlots(s, 0, 5).ok).toBe(false);
  });
});

describe('sortedBackpack', () => {
  it('sorts by name, level or biome, and keeps catch order by default', () => {
    const list = [mon(content, 'yeti', 3), mon(content, 'bushtail', 9), mon(content, 'pengwiggle', 5)];
    const names = (by: Parameters<typeof sortedBackpack>[2]) => sortedBackpack(content, list, by).map((m) => m.species);
    expect(names('caught')).toEqual(['yeti', 'bushtail', 'pengwiggle']);
    expect(names('name')).toEqual(['bushtail', 'pengwiggle', 'yeti']);
    expect(names('level')).toEqual(['bushtail', 'pengwiggle', 'yeti']);
    expect(names('biome')[0]).toBe('bushtail'); // forest before snowy
    expect(list.map((m) => m.species)).toEqual(['yeti', 'bushtail', 'pengwiggle']); // not changed in place
  });
});

describe('evolving', () => {
  const base = content.monsters.find((m) => m.evolvesTo)!;
  const evo = base.evolvesTo!;

  it('finds monsters at their evolve level and evolves them', () => {
    let s = withTeam(base.id);
    expect(readyToEvolve(content, s)).toEqual([]);
    s = { ...s, team: s.team.map((m) => ({ ...m, level: evo.level })) };
    expect(readyToEvolve(content, s).map((m) => m.species)).toEqual([base.id]);
    const r = evolveMonster(content, s, s.team[0]!.uid);
    if (!r.ok) throw new Error(r.reason);
    expect(r.from.species).toBe(base.id);
    expect(r.to.species).toBe(evo.monster);
    expect(r.state.team[0]!.species).toBe(evo.monster);
    expect(r.state.caught).toContain(evo.monster);
    expect(readyToEvolve(content, r.state)).toEqual([]);
  });

  it('debug leveling takes the team to its evolve level', () => {
    const s = debugLevelTeam(content, withTeam(base.id));
    expect(s.team[0]!.level).toBe(evo.level);
    expect(readyToEvolve(content, s)).toHaveLength(1);
  });

  it('says no when the monster is not ready or not yours', () => {
    const s = withTeam(base.id);
    expect(evolveMonster(content, s, s.team[0]!.uid).ok).toBe(false);
    expect(evolveMonster(content, s, 999).ok).toBe(false);
  });
});

describe('Monster Book', () => {
  it('lists every monster but Avatar: unseen, seen, caught, Big', () => {
    let s = withTeam('bushtail');
    s = { ...s, seen: [...s.seen, 'yeti'], caughtBig: ['bushtail'] };
    const book = bookEntries(content, s);
    expect(book).toHaveLength(content.monsters.filter((m) => m.kind === 'monster').length);
    expect(book.some((e) => e.id === 'avatar')).toBe(false);
    const byId = (id: string) => book.find((e) => e.id === id)!;
    expect(byId('bushtail')).toMatchObject({ status: 'caught', big: true, name: 'Bushtail', wild: true });
    expect(byId('yeti')).toMatchObject({ status: 'seen', name: 'Yeti' });
    const unseen = byId('peggy');
    expect(unseen).toMatchObject({ status: 'unseen', name: '???', text: 'Lives in the Forest.' });
    const evolved = book.find((e) => !e.wild)!;
    expect(evolved.text).toBe('Grows from another monster.');
  });

  it('counts progress toward the Avatar gate', () => {
    const sum = bookSummary(content, withTeam('bushtail', 'peggy'));
    expect(sum).toMatchObject({ seen: 2, caught: 2 });
    expect(sum.gate.caught).toBe(2);
    expect(sum.gate.needed).toBe(content.monsters.filter((m) => m.spawnWeight !== null).length);
  });
});

describe('items outside battle', () => {
  it('lists only healing items you have', () => {
    const s = { ...withTeam('bushtail'), bag: { cage: 3, potion: 2, 'wake-up-snack': 0 } };
    expect(healingItems(content, s).map((i) => [i.id, i.count])).toEqual([['potion', 2]]);
  });

  it('a potion needs a hurt, awake monster; a snack needs a knocked-out one', () => {
    const m = mon(content, 'bushtail', 5);
    expect(itemTargetProblem(content, 'potion', m)).toMatch(/full HP/);
    expect(itemTargetProblem(content, 'potion', { ...m, hp: 1 })).toBeNull();
    expect(itemTargetProblem(content, 'potion', { ...m, hp: 0 })).toMatch(/knocked-out/);
    expect(itemTargetProblem(content, 'wake-up-snack', { ...m, hp: 0 })).toBeNull();
    expect(itemTargetProblem(content, 'wake-up-snack', m)).toMatch(/awake/);
    expect(itemTargetProblem(content, 'cage', m)).toMatch(/can't use/);
  });
});
