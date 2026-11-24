import { describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../../src/logic/game';
import { canCrossWater, canSwim, ridingMonster, startRide, stepMs, stopRide } from '../../../src/logic/riding';
import { mon, realContent } from '../helpers';

const content = realContent();

function state(): GameState {
  return {
    ...newGame(content, 'forest', 1),
    team: [mon(content, 'yeti', 10, { uid: 1, big: true }), mon(content, 'dumble', 10, { uid: 2 })],
    backpack: [mon(content, 'mr-toothache', 10, { uid: 3, big: true })],
  };
}

describe('riding (Round 88)', () => {
  it('only starred Big monsters can be ridden', () => {
    const r = startRide(content, state(), 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Only Big monsters/);
    const big = startRide(content, state(), 1);
    expect(big.ok && big.state.riding).toBe(1);
  });

  it('works from the backpack too, and switching rides just changes the monster', () => {
    const a = startRide(content, state(), 1);
    if (!a.ok) throw new Error(a.reason);
    const b = startRide(content, a.state, 3);
    expect(b.ok && ridingMonster(b.state)?.uid).toBe(3);
  });

  it('riding is twice as fast as walking', () => {
    const s = state();
    expect(stepMs(content, s, 140)).toBe(140);
    const r = startRide(content, s, 1);
    if (!r.ok) throw new Error(r.reason);
    expect(stepMs(content, r.state, 140)).toBe(70);
  });

  it('Big Beach monsters swim: they carry you over water; others do not', () => {
    expect(canSwim(content, { big: true, species: 'mr-toothache' })).toBe(true);
    expect(canSwim(content, { big: false, species: 'mr-toothache' })).toBe(false);
    expect(canSwim(content, { big: true, species: 'yeti' })).toBe(false);
    const yeti = startRide(content, state(), 1);
    const shark = startRide(content, state(), 3);
    expect(yeti.ok && canCrossWater(content, yeti.state)).toBe(false);
    expect(shark.ok && canCrossWater(content, shark.state)).toBe(true);
    expect(canCrossWater(content, state())).toBe(false);
  });

  it("you can get off on land but not in the water", () => {
    const r = startRide(content, state(), 3);
    if (!r.ok) throw new Error(r.reason);
    expect(stopRide(r.state, true).ok).toBe(false);
    const off = stopRide(r.state, false);
    expect(off.ok && off.state.riding).toBe(null);
    expect(stopRide(state(), false).ok).toBe(false);
  });

  it('a ridden monster that is no longer with you does not count', () => {
    expect(ridingMonster({ ...state(), riding: 99 })).toBe(null);
  });
});
