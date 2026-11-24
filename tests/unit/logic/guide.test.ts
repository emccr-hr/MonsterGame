import { describe, expect, it } from 'vitest';
import { addCaught, newGame, type GameState } from '../../../src/logic/game';
import { conditionHolds, nextGoal, topicsFor } from '../../../src/logic/guide';
import { realContent } from '../helpers';

const content = realContent();

const caught = (s: GameState, id: string, level = 5) => addCaught(content, s, { species: id, level, big: false, hp: 9999, burned: 0 }).state;

describe("Papai's next goal", () => {
  it('starts with catching the first monster', () => {
    expect(nextGoal(content, newGame(content, 'forest', 1))).toMatch(/^Catch your first monster/);
  });

  it('says to heal when every team monster is knocked out', () => {
    const s = caught(newGame(content, 'forest', 1), 'bushtail');
    const tired = { ...s, team: s.team.map((m) => ({ ...m, hp: 0 })) };
    expect(nextGoal(content, tired)).toMatch(/Reviver/);
  });

  it('points to the shop for map parts, or to battles to earn gems', () => {
    const s = caught(newGame(content, 'forest', 1), 'bushtail');
    expect(nextGoal(content, s)).toMatch(/enough gems for a map part/);
    expect(nextGoal(content, { ...s, gems: 10 })).toMatch(/earn Magic Gems/);
  });

  it('counts wild monsters once every place is open', () => {
    const s = { ...caught(newGame(content, 'forest', 1), 'bushtail'), openBiomes: content.biomes.map((b) => b.id) };
    expect(nextGoal(content, s)).toMatch(/You have 1 of 34/);
  });

  it("opens Avatar's arena when every wild monster is caught", () => {
    let s = newGame(content, 'forest', 1);
    for (const m of content.monsters.filter((x) => x.spawnWeight !== null)) s = caught(s, m.id);
    expect(conditionHolds(content, s, 'arenaOpen')).toBe(true);
    expect(nextGoal(content, s)).toMatch(/caught every wild monster/);
    expect(conditionHolds(content, { ...s, avatarBeaten: true }, 'arenaOpen')).toBe(false);
  });
});

describe("Papai's questions", () => {
  it('hides teleporting until a team monster is level 50', () => {
    const s = caught(newGame(content, 'forest', 1), 'bushtail', 10);
    expect(topicsFor(content, s).some((t) => t.id === 'teleport')).toBe(false);
    const strong = { ...s, team: s.team.map((m) => ({ ...m, level: 50 })) };
    expect(topicsFor(content, strong).some((t) => t.id === 'teleport')).toBe(true);
  });

  it('every condition can be checked', () => {
    const s = newGame(content, 'forest', 1);
    for (const t of content.guide.topics) if (t.unlock) expect(typeof conditionHolds(content, s, t.unlock)).toBe('boolean');
    for (const g of content.guide.goals) expect(typeof conditionHolds(content, s, g.when)).toBe('boolean');
  });

  it('after Avatar, suggests Big Monsters and the Monster Book, and answers "What now?"', () => {
    let s = newGame(content, 'forest', 1);
    for (const m of content.monsters.filter((x) => x.spawnWeight !== null)) s = caught(s, m.id);
    s = { ...s, avatarBeaten: true };
    expect(nextGoal(content, s)).toMatch(/Big Monsters.*Monster Book/);
    expect(topicsFor(content, s).some((t) => t.id === 'after-avatar')).toBe(true);
    expect(topicsFor(content, { ...s, avatarBeaten: false }).some((t) => t.id === 'after-avatar')).toBe(false);
  });
});
