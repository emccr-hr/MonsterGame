import { describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../../src/logic/game';
import { xpToNext } from '../../../src/logic/growth';
import { penTick, penXpPerMinute, putInPen, takeFromPen } from '../../../src/logic/pen';
import { mon, realContent } from '../helpers';

const content = realContent();

function state(teamSize = 2, packSize = 5): GameState {
  return {
    ...newGame(content, 'forest', 1),
    team: Array.from({ length: teamSize }, (_, i) => mon(content, 'dumble', 10, { uid: i + 1 })),
    backpack: Array.from({ length: packSize }, (_, i) => mon(content, 'peggy', 10, { uid: 100 + i })),
  };
}

function must(r: { ok: true; state: GameState } | { ok: false; reason: string }): GameState {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

describe('the monster pen (Round 89)', () => {
  it('holds up to 5 monsters, from the team or the backpack', () => {
    let s = state();
    s = must(putInPen(content, s, 1));
    for (let i = 0; i < 4; i++) s = must(putInPen(content, s, 100 + i));
    expect(s.pen.map((m) => m.uid)).toEqual([1, 100, 101, 102, 103]);
    expect(s.team.map((m) => m.uid)).toEqual([2]);
    const full = putInPen(content, s, 104);
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.reason).toMatch(/full/);
  });

  it('keeps at least one monster on the team, and not the one you ride', () => {
    expect(putInPen(content, state(1, 0), 1).ok).toBe(false);
    expect(putInPen(content, { ...state(), riding: 2 }, 2).ok).toBe(false);
  });

  it('taking one out puts it on the team, or in the backpack when the team is full', () => {
    let s = must(putInPen(content, state(2, 1), 100));
    s = must(takeFromPen(content, s, 100));
    expect(s.team.map((m) => m.uid)).toEqual([1, 2, 100]);
    let full = must(putInPen(content, state(content.rules.teamSize, 1), 100));
    full = must(takeFromPen(content, full, 100));
    expect(full.backpack.map((m) => m.uid)).toEqual([100]);
    expect(takeFromPen(content, state(), 999).ok).toBe(false);
  });

  it('pen monsters gain XP over time, about as fast as battling (one equal-level win a minute)', () => {
    let s = must(putInPen(content, state(), 100));
    expect(penXpPerMinute(content, 10)).toBe(40);
    const r = penTick(content, s, 1);
    expect(r.state.pen[0]!.xp).toBe(40);
    // Level 10 → 11 takes 100 XP: three minutes.
    s = penTick(content, r.state, 2).state;
    expect(s.pen[0]!.level).toBe(11);
    expect(xpToNext(10)).toBe(100);
  });

  it('says who leveled up, and leaves the team and backpack alone', () => {
    const s = must(putInPen(content, state(), 100));
    const r = penTick(content, s, 3);
    expect(r.leveledUp).toEqual(['Peggy']);
    expect(r.state.team).toEqual(s.team);
    expect(penTick(content, state(), 5).state).toEqual(state());
  });
});
