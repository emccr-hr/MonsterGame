import { describe, expect, it } from 'vitest';
import { realContent } from '../helpers';
import { addCaught, newGame, type GameState } from '../../../src/logic/game';
import { MIGRATIONS, SAVE_VERSION, deserialize, serialize } from '../../../src/logic/save';

const content = realContent();

function playedState(): GameState {
  let s = newGame(content, 'forest', 12345);
  for (const species of ['bushtail', 'hootle', 'peggy', 'bushtail', 'hootle', 'peggy', 'bushtail']) {
    s = addCaught(content, s, { species, level: 6, big: species === 'peggy', hp: 9999, burned: 0 }).state;
  }
  return { ...s, gems: 42, pins: [{ id: 1, scene: 'forest', x: 3.5, y: 8 }], openBiomes: ['forest', 'beach'] };
}

describe('serialize', () => {
  it('writes JSON with the current version', () => {
    const parsed = JSON.parse(serialize(newGame(content, 'forest', 1)));
    expect(parsed.version).toBe(SAVE_VERSION);
    expect(parsed.state.gems).toBe(100);
  });
});

describe('deserialize', () => {
  it('round-trips a new game', () => {
    const s = newGame(content, 'snowy', 99);
    expect(deserialize(serialize(s))).toEqual({ ok: true, state: s });
  });

  it('round-trips a game after some catches', () => {
    const s = playedState();
    expect(deserialize(serialize(s))).toEqual({ ok: true, state: s });
  });

  it('rejects text that is not JSON', () => {
    const r = deserialize('this is not a save');
    expect(r.ok).toBe(false);
  });

  it('rejects JSON that is not an object', () => {
    expect(deserialize('42').ok).toBe(false);
    expect(deserialize('null').ok).toBe(false);
    expect(deserialize('"hi"').ok).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(deserialize('').ok).toBe(false);
  });

  it('rejects a save with no version', () => {
    const r = deserialize(JSON.stringify({ state: newGame(content, 'forest', 1) }));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.reason).toMatch(/no version/);
  });

  it('rejects a version that is not a whole number of at least 1', () => {
    const state = newGame(content, 'forest', 1);
    for (const version of [0, -1, 1.5, '1', null]) {
      expect(deserialize(JSON.stringify({ version, state })).ok).toBe(false);
    }
  });

  it('rejects a save from a newer version', () => {
    const r = deserialize(JSON.stringify({ version: SAVE_VERSION + 1, state: newGame(content, 'forest', 1) }));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.reason).toMatch(/newer/);
  });

  it('rejects a damaged state', () => {
    const r = deserialize(JSON.stringify({ version: SAVE_VERSION, state: { gems: 5 } }));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.reason).toMatch(/damaged/);
  });

  it('rejects a missing state', () => {
    expect(deserialize(JSON.stringify({ version: SAVE_VERSION })).ok).toBe(false);
  });

  it('rejects negative gems and a bad monster', () => {
    const s = playedState();
    expect(deserialize(JSON.stringify({ version: SAVE_VERSION, state: { ...s, gems: -1 } })).ok).toBe(false);
    const bad = { ...s, team: [{ ...s.team[0]!, level: 0 }] };
    expect(deserialize(JSON.stringify({ version: SAVE_VERSION, state: bad })).ok).toBe(false);
  });
});

describe('migrations', () => {
  it('version 2 (Rounds 88-89) adds riding and the pen', () => {
    expect(SAVE_VERSION).toBe(2);
    expect(Object.keys(MIGRATIONS)).toEqual(['1']);
  });

  it('a version 1 save loads with nobody ridden and an empty pen', () => {
    const { riding: _r, pen: _p, ...old } = newGame(content, 'forest', 7);
    const loaded = deserialize(JSON.stringify({ version: 1, state: old }));
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state.riding).toBe(null);
      expect(loaded.state.pen).toEqual([]);
    }
  });
});
