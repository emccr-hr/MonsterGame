import { describe, expect, it } from 'vitest';
import endingJson from '../../../src/data/ending.json';
import { ending } from '../../../src/data/schema';
import { adventureLines, arenaGate, playsEnding } from '../../../src/logic/ending';
import { newGame, type GameState } from '../../../src/logic/game';
import { mon, realContent } from '../helpers';

const content = realContent();
const wildIds = content.monsters.filter((m) => m.kind === 'monster' && m.spawnWeight !== null).map((m) => m.id);
const withAll = (): GameState => ({ ...newGame(content, 'forest', 1), caught: [...wildIds], team: [mon(content, 'bushtail', 40)] });

describe("Avatar's arena gate", () => {
  it('stays locked and shows the count until every wild monster is caught', () => {
    const s = { ...withAll(), caught: wildIds.slice(1) };
    const gate = arenaGate(content, s);
    expect(gate.battle).toBe(false);
    expect(gate.text).toContain(`${wildIds.length - 1} / ${wildIds.length}`);
  });

  it('starts the battle once every wild monster is caught', () => {
    expect(arenaGate(content, withAll())).toEqual({ battle: true, text: expect.stringMatching(/Avatar is waiting/) });
  });

  it('needs an awake monster on the team', () => {
    const tired = withAll();
    tired.team = tired.team.map((m) => ({ ...m, hp: 0 }));
    expect(arenaGate(content, tired).battle).toBe(false);
    expect(arenaGate(content, { ...withAll(), team: [] }).battle).toBe(false);
  });

  it('stays open for a rematch after Avatar is beaten (the game keeps going, Round 63)', () => {
    const gate = arenaGate(content, { ...withAll(), avatarBeaten: true });
    expect(gate.battle).toBe(true);
    expect(gate.text).toMatch(/rematch/);
  });
});

describe('the ending', () => {
  it('plays only the first time Avatar is beaten', () => {
    const s = withAll();
    expect(playsEnding(s, { ...s, avatarBeaten: true })).toBe(true);
    expect(playsEnding({ ...s, avatarBeaten: true }, { ...s, avatarBeaten: true })).toBe(false);
    expect(playsEnding(s, s)).toBe(false);
  });

  it('sums up the adventure from the save', () => {
    const s = { ...withAll(), caughtBig: ['bushtail'], backpack: [mon(content, 'bushtail', 12)] };
    const kinds = content.monsters.filter((m) => m.kind === 'monster').length;
    expect(adventureLines(content, s)).toEqual([
      `Monsters caught: ${wildIds.length} of ${kinds} kinds`,
      'Big Monsters caught: 1',
      'Monsters on your team and in your backpack: 2',
      'Highest level: 40',
    ]);
  });

  it('has valid words and credits in ending.json', () => {
    const parsed = ending.parse(endingJson);
    expect(parsed.story.length).toBeGreaterThan(0);
    expect(parsed.credits.some((c) => /design/i.test(c.role))).toBe(true);
    expect(parsed.after).toMatch(/keeps going/);
  });
});
