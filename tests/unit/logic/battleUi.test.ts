import { describe, expect, it } from 'vitest';
import { resolveTurn, startBattle } from '../../../src/logic/battle';
import { bagMenu, battleSpriteSize, eventText, mainMenu, moveMenu, sideName, teamMenu } from '../../../src/logic/battleUi';
import { mon, realContent, scriptedRng } from '../helpers';

const content = realContent();
const bag = { cage: 5, potion: 1, 'wake-up-snack': 1 };

describe('battle menus', () => {
  it('first catch with no team: only "Throw cage" (Round 61)', () => {
    const s = startBattle('wild', [], mon(content, 'yeti', 3), bag);
    expect(mainMenu(s).map((c) => c.label)).toEqual(['Throw cage']);
    expect(mainMenu(s)[0]!.pick).toEqual({ kind: 'cage' });
  });

  it('with a team: Fight, Cage, Bag, Switch, Run; Avatar has no Cage or Run', () => {
    const wild = startBattle('wild', [mon(content, 'yeti', 5)], mon(content, 'yeti', 3), bag);
    expect(mainMenu(wild).map((c) => c.label)).toEqual(['Fight', 'Cage (5)', 'Bag', 'Switch', 'Run']);
    const boss = startBattle('boss', [mon(content, 'yeti', 5)], mon(content, 'avatar', 30), bag);
    expect(mainMenu(boss).map((c) => c.label)).toEqual(['Fight', 'Bag', 'Switch']);
  });

  it('lists moves, usable items and awake teammates', () => {
    const tired = { ...mon(content, 'bushtail', 5), hp: 0 };
    const s = startBattle('wild', [mon(content, 'yeti', 5), tired, mon(content, 'pengwiggle', 5)], mon(content, 'yeti', 3), bag);
    expect(moveMenu(content, s)).toHaveLength(content.monsters.find((m) => m.id === 'yeti')!.moves.length);
    expect(bagMenu(content, s).map((c) => c.pick)).toEqual([
      { kind: 'item', item: 'potion', target: 0 },
      { kind: 'item', item: 'wake-up-snack', target: 1 },
    ]);
    expect(teamMenu(content, s).map((c) => c.pick)).toEqual([{ kind: 'switch', to: 2 }]);
  });
});

describe('battle text', () => {
  it('names the wild monster and Avatar', () => {
    const s = startBattle('wild', [mon(content, 'yeti', 5)], mon(content, 'pengwiggle', 3), bag);
    expect(sideName(content, s, 'enemy')).toBe('the wild Pengwiggle');
    expect(sideName(content, s, 'player')).toBe('Yeti');
    const boss = startBattle('boss', [mon(content, 'yeti', 5)], mon(content, 'avatar', 30), bag);
    expect(sideName(content, boss, 'enemy')).toBe('Avatar');
  });

  it('every event of a real turn has a line or a screen change, and damage has no text', () => {
    const s = startBattle('wild', [mon(content, 'yeti', 5)], mon(content, 'pengwiggle', 3), bag);
    const { state, events } = resolveTurn(content, s, { kind: 'move', move: s.player.team[0]!.m.moves[0]! }, scriptedRng([], 0.5));
    const lines = events.map((e) => eventText(content, state, e));
    expect(lines[0]).toMatch(/used .+!$/);
    events.forEach((e, i) => {
      if (e.type === 'damage') expect(lines[i]).toBeNull();
    });
    expect(eventText(content, state, { type: 'end', outcome: 'won' })).toBe('You won!');
    expect(eventText(content, state, { type: 'end', outcome: 'fled' })).toBe('The wild Pengwiggle ran away!');
    expect(eventText(content, state, { type: 'throw', throw: { result: 'caught', wobbles: 3 } })).toBe('Gotcha! You caught the wild Pengwiggle!');
  });
});

describe('battle sprite size', () => {
  it('squeezes sizes between 56 and 240 px, bigger still looks bigger', () => {
    expect(battleSpriteSize(1)).toBe(72);
    expect(battleSpriteSize(0.25)).toBe(56);
    expect(battleSpriteSize(10)).toBe(228);
    expect(battleSpriteSize(50)).toBe(240);
    expect(battleSpriteSize(4)).toBeGreaterThan(battleSpriteSize(2));
  });
});
