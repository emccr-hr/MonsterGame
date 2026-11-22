import { describe, expect, it } from 'vitest';
import { realContent } from '../helpers';
import {
  addCaught,
  awakeTeam,
  markSeen,
  newGame,
  replaceMonster,
  setLeader,
  swapWithBackpack,
  teamLevels,
  toBackpack,
  toTeam,
  type GameState,
  type Result,
} from '../../../src/logic/game';
import { maxHp } from '../../../src/logic/monster';

const content = realContent();

function withCaught(n: number, speciesId = 'bushtail', level = 5): GameState {
  let state = newGame(content, 'forest', 1);
  for (let i = 0; i < n; i++) {
    state = addCaught(content, state, { species: speciesId, level, big: false, hp: 9999, burned: 0 }).state;
  }
  return state;
}

function expectOk(r: Result<GameState>): GameState {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

describe('newGame', () => {
  it('starts with 100 cages and 100 gems', () => {
    const s = newGame(content, 'beach', 5);
    expect(s.bag).toEqual({ cage: 100 });
    expect(s.gems).toBe(100);
  });

  it('starts with no monsters and an empty Monster Book', () => {
    const s = newGame(content, 'beach', 5);
    expect(s.team).toEqual([]);
    expect(s.backpack).toEqual([]);
    expect([s.seen, s.caught, s.caughtBig]).toEqual([[], [], []]);
  });

  it('opens only the chosen biome', () => {
    expect(newGame(content, 'desert', 5).openBiomes).toEqual(['desert']);
  });

  it('wakes up at Ansonville, with no pins and the Avatar not beaten', () => {
    const s = newGame(content, 'desert', 5);
    expect(s).toMatchObject({ lastReviver: 'ansonville', pins: [], avatarBeaten: false, nextUid: 1 });
  });

  it('keeps the random state it was given', () => {
    expect(newGame(content, 'forest', 777).rngState).toBe(777);
  });

  it('throws for an unknown biome', () => {
    expect(() => newGame(content, 'moon', 1)).toThrow(/Unknown biome/);
  });
});

describe('addCaught', () => {
  it('puts the first monster on the team', () => {
    const r = addCaught(content, newGame(content, 'forest', 1), { species: 'peggy', level: 3, big: false, hp: 9999, burned: 0 });
    expect(r.toTeam).toBe(true);
    expect(r.state.team).toHaveLength(1);
    expect(r.state.team[0]).toEqual(r.monster);
  });

  it('fills the team with the first 6, then the backpack', () => {
    const s = withCaught(8);
    expect(s.team).toHaveLength(6);
    expect(s.backpack).toHaveLength(2);
  });

  it('says toTeam false for the 7th', () => {
    const r = addCaught(content, withCaught(6), { species: 'peggy', level: 3, big: false, hp: 9999, burned: 0 });
    expect(r.toTeam).toBe(false);
    expect(r.state.backpack).toEqual([r.monster]);
  });

  it('gives every monster a unique uid', () => {
    const s = withCaught(9);
    const uids = [...s.team, ...s.backpack].map((m) => m.uid);
    expect(new Set(uids).size).toBe(9);
    expect(s.nextUid).toBe(10);
  });

  it('records seen and caught', () => {
    const s = withCaught(1, 'hootle');
    expect(s.seen).toEqual(['hootle']);
    expect(s.caught).toEqual(['hootle']);
    expect(s.caughtBig).toEqual([]);
  });

  it('records a Big catch', () => {
    const s = addCaught(content, newGame(content, 'forest', 1), { species: 'hootle', level: 3, big: true, hp: 9999, burned: 0 }).state;
    expect(s.caughtBig).toEqual(['hootle']);
  });

  it('does not list a species twice', () => {
    const s = withCaught(3, 'hootle');
    expect(s.caught).toEqual(['hootle']);
    expect(s.seen).toEqual(['hootle']);
  });

  it('keeps the wild monster HP, up to its max', () => {
    const s = newGame(content, 'forest', 1);
    const hurt = addCaught(content, s, { species: 'peggy', level: 10, big: false, hp: 3, burned: 2 });
    expect(hurt.monster.hp).toBe(3);
    expect(hurt.monster.burned).toBe(0);
    const healthy = addCaught(content, s, { species: 'peggy', level: 10, big: false, hp: 99999, burned: 0 });
    expect(healthy.monster.hp).toBe(maxHp(content, healthy.monster));
  });

  it('does not change the old state', () => {
    const s = withCaught(2);
    const copy = structuredClone(s);
    addCaught(content, s, { species: 'peggy', level: 3, big: false, hp: 5, burned: 0 });
    expect(s).toEqual(copy);
  });
});

describe('markSeen and replaceMonster', () => {
  it('markSeen adds a species once', () => {
    const s = markSeen(markSeen(newGame(content, 'forest', 1), 'peggy'), 'peggy');
    expect(s.seen).toEqual(['peggy']);
  });

  it('replaceMonster swaps by uid and records the new form as caught', () => {
    const s = withCaught(2);
    const first = s.team[0]!;
    const updated = { ...first, species: 'treetail' };
    const next = replaceMonster(s, updated);
    expect(next.team[0]).toEqual(updated);
    expect(next.team[1]).toEqual(s.team[1]);
    expect(next.caught).toContain('treetail');
  });
});

describe('toTeam', () => {
  it('moves a backpack monster onto the team', () => {
    const s = withCaught(7);
    const m = s.backpack[0]!;
    const small = expectOk(toBackpack(s, s.team[0]!.uid));
    const next = expectOk(toTeam(content, small, m.uid));
    expect(next.team.map((x) => x.uid)).toContain(m.uid);
    expect(next.backpack.map((x) => x.uid)).not.toContain(m.uid);
  });

  it('refuses when the team is full', () => {
    const s = withCaught(7);
    const r = toTeam(content, s, s.backpack[0]!.uid);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.reason).toMatch(/full/);
  });

  it('refuses a monster that is not in the backpack', () => {
    const s = withCaught(2);
    expect(toTeam(content, s, 424242).ok).toBe(false);
  });
});

describe('toBackpack', () => {
  it('moves a team monster to the backpack', () => {
    const s = withCaught(3);
    const uid = s.team[1]!.uid;
    const next = expectOk(toBackpack(s, uid));
    expect(next.team).toHaveLength(2);
    expect(next.backpack.map((x) => x.uid)).toEqual([uid]);
  });

  it('keeps at least one monster on the team', () => {
    const s = withCaught(1);
    const r = toBackpack(s, s.team[0]!.uid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/at least one/);
  });

  it('refuses a monster that is not on the team', () => {
    expect(toBackpack(withCaught(3), 424242).ok).toBe(false);
  });
});

describe('swapWithBackpack', () => {
  it('swaps in the same team slot', () => {
    const s = withCaught(7);
    const t = s.team[2]!;
    const b = s.backpack[0]!;
    const next = expectOk(swapWithBackpack(s, t.uid, b.uid));
    expect(next.team[2]!.uid).toBe(b.uid);
    expect(next.backpack[0]!.uid).toBe(t.uid);
    expect(next.team).toHaveLength(6);
  });

  it('refuses when either monster is missing', () => {
    const s = withCaught(7);
    expect(swapWithBackpack(s, 424242, s.backpack[0]!.uid).ok).toBe(false);
    expect(swapWithBackpack(s, s.team[0]!.uid, 424242).ok).toBe(false);
  });
});

describe('setLeader', () => {
  it('moves that monster to the front and keeps the rest in order', () => {
    const s = withCaught(4);
    const order = s.team.map((m) => m.uid);
    const next = expectOk(setLeader(s, order[2]!));
    expect(next.team.map((m) => m.uid)).toEqual([order[2], order[0], order[1], order[3]]);
  });

  it('refuses a monster that is not on the team', () => {
    expect(setLeader(withCaught(2), 424242).ok).toBe(false);
  });
});

describe('awakeTeam and teamLevels', () => {
  it('leaves out knocked-out monsters', () => {
    const s = withCaught(3);
    const hurt = { ...s, team: s.team.map((m, i) => (i === 0 ? { ...m, hp: 0 } : m)) };
    expect(awakeTeam(hurt)).toHaveLength(2);
  });

  it('lists team levels', () => {
    expect(teamLevels(withCaught(2, 'peggy', 7))).toEqual([7, 7]);
    expect(teamLevels(newGame(content, 'forest', 1))).toEqual([]);
  });
});

describe('no function changes its input', () => {
  it('toTeam, toBackpack, swap and leader leave the state alone', () => {
    const s = withCaught(7);
    const copy = structuredClone(s);
    toTeam(content, s, s.backpack[0]!.uid);
    toBackpack(s, s.team[0]!.uid);
    swapWithBackpack(s, s.team[0]!.uid, s.backpack[0]!.uid);
    setLeader(s, s.team[3]!.uid);
    markSeen(s, 'peggy');
    replaceMonster(s, { ...s.team[0]!, level: 99 });
    expect(s).toEqual(copy);
  });
});
