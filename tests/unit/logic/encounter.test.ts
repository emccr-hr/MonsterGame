import { describe, expect, it } from 'vitest';
import { resolveTurn, type BattleState } from '../../../src/logic/battle';
import { avatarLevel, finishBattle, startAvatarBattle, startWildEncounter } from '../../../src/logic/encounter';
import { addCaught, newGame, type GameState } from '../../../src/logic/game';
import { maxHp } from '../../../src/logic/monster';
import { createRng } from '../../../src/logic/rng';
import { mon, realContent, scriptedRng } from '../helpers';

const content = realContent();

function withTeam(species: string[], level: number): GameState {
  let s = newGame(content, 'forest', 1);
  for (const id of species) s = addCaught(content, s, mon(content, id, level)).state;
  return s;
}

const play = (b: BattleState, action: Parameters<typeof resolveTurn>[2], roll = 0.999) =>
  resolveTurn(content, b, action, scriptedRng([], roll)).state;

describe('wild encounters', () => {
  it('spawns a wild monster from that biome, marks it seen, and starts a battle', () => {
    const s = withTeam(['dumble'], 10);
    const { state, battle } = startWildEncounter(content, s, 'volcano', createRng(3));
    const wild = battle.enemy.team[0]!.m;
    expect(content.monsters.filter((m) => m.biome === 'volcano' && m.spawnWeight !== null).map((m) => m.id)).toContain(wild.species);
    expect(state.seen).toContain(wild.species);
    expect(battle.kind).toBe('wild');
    expect(battle.bag.cage).toBe(100);
  });

  it('the first encounter (no team) only allows a cage throw', () => {
    const s = newGame(content, 'beach', 1);
    const { battle } = startWildEncounter(content, s, 'beach', createRng(1));
    expect(battle.player.active).toBe(-1);
    expect(battle.enemy.team[0]!.m.level).toBeLessThanOrEqual(4);
  });
});

describe('finishing a battle', () => {
  it('a catch adds the monster, uses a cage, and keeps its HP', () => {
    const s = newGame(content, 'beach', 1);
    const { state, battle } = startWildEncounter(content, s, 'beach', createRng(1));
    const done = play(battle, { kind: 'cage' }, 0);
    const { state: after, rewards } = finishBattle(content, state, done, createRng(2));
    expect(after.team).toHaveLength(1);
    expect(after.team[0]!.species).toBe(battle.enemy.team[0]!.m.species);
    expect(after.caught).toContain(after.team[0]!.species);
    expect(after.bag.cage).toBe(99);
    expect(rewards.caught?.uid).toBe(after.team[0]!.uid);
    expect(rewards.caughtToTeam).toBe(true);
  });

  it('a win gives every awake team monster XP, and gems', () => {
    const s = withTeam(['moltenmaw', 'dumble'], 30);
    const knocked = { ...s, team: [s.team[0]!, { ...s.team[1]!, hp: 0 }] };
    const { battle } = startWildEncounter(content, knocked, 'forest', createRng(5));
    let b = battle;
    for (let i = 0; i < 20 && !b.outcome; i++) b = play(b, { kind: 'move', move: 'magma-slam' });
    expect(b.outcome).toBe('won');
    const { state, rewards } = finishBattle(content, knocked, b, createRng(9));
    expect(rewards.xp).toBeGreaterThan(0);
    expect(rewards.gems).toBeGreaterThanOrEqual(5);
    expect(rewards.gems).toBeLessThanOrEqual(10);
    expect(state.gems).toBe(100 + rewards.gems);
    const before = knocked.team[0]!;
    const after = state.team[0]!;
    expect(after.level * 1000 + after.xp).toBeGreaterThan(before.level * 1000 + before.xp);
    expect(state.team[1]!.xp).toBe(0); // knocked out: no XP
  });

  it('a win can make a monster ready to evolve', () => {
    const s = withTeam(['anti-ant'], 14);
    const ready = { ...s, team: [{ ...s.team[0]!, xp: 139 }] }; // 1 XP short of level 15
    // A set wild Bushtail (the forest has more species since Round 69), so the fight is the same every time.
    const { battle } = startWildEncounter(content, ready, 'forest', createRng(4), { species: 'bushtail', level: 12, big: false });
    let b = battle;
    for (let i = 0; i < 40 && !b.outcome; i++) b = play(b, { kind: 'move', move: 'sting' });
    expect(b.outcome).toBe('won');
    const { rewards } = finishBattle(content, ready, b, createRng(1));
    expect(rewards.levelUps[ready.team[0]!.uid]).toBeGreaterThanOrEqual(1);
    expect(rewards.evolutions[ready.team[0]!.uid]).toBe('queen-ant');
  });

  it('losing: wake up at the last Reviver with everyone healed', () => {
    const s = { ...withTeam(['dumble'], 2), lastReviver: 'volcano' };
    const { battle } = startWildEncounter(content, s, 'volcano', createRng(1));
    const lost: BattleState = { ...battle, outcome: 'lost', player: { ...battle.player, team: battle.player.team.map((c) => ({ ...c, m: { ...c.m, hp: 0, burned: 2 } })) } };
    const { state } = finishBattle(content, s, lost, createRng(1));
    expect(state.team[0]!.hp).toBe(maxHp(content, state.team[0]!));
    expect(state.team[0]!.burned).toBe(0);
    expect(state.lastReviver).toBe('volcano');
  });

  it('running away keeps HP as it was and gives nothing', () => {
    const s = withTeam(['dumble'], 10);
    const { battle } = startWildEncounter(content, s, 'forest', createRng(1));
    const hurt = { ...battle, player: { ...battle.player, team: [{ ...battle.player.team[0]!, m: { ...battle.player.team[0]!.m, hp: 3 } }] } };
    const done = play(hurt, { kind: 'run' });
    const { state, rewards } = finishBattle(content, s, done, createRng(1));
    expect(state.team[0]!.hp).toBe(3);
    expect(rewards.xp).toBe(0);
    expect(state.gems).toBe(100);
  });

  it('refuses a battle that is not over', () => {
    const s = withTeam(['dumble'], 10);
    const { battle } = startWildEncounter(content, s, 'forest', createRng(1));
    expect(() => finishBattle(content, s, battle, createRng(1))).toThrow(/not over/);
  });

  it('saves the random state so a loaded game continues the same dice', () => {
    const s = withTeam(['dumble'], 10);
    const { battle } = startWildEncounter(content, s, 'forest', createRng(1));
    const rng = createRng(77);
    const { state } = finishBattle(content, s, play(battle, { kind: 'run' }), rng);
    expect(state.rngState).toBe(rng.getState());
  });
});

describe('Avatar', () => {
  it('fights at the team’s best level + 5, and never below 30', () => {
    expect(avatarLevel(withTeam(['dumble'], 10))).toBe(30);
    expect(avatarLevel(withTeam(['dumble', 'moltenmaw'], 50))).toBe(55);
  });

  it('beating Avatar is recorded (and gives no gems)', () => {
    const s = withTeam(['moltenmaw'], 50);
    const b = startAvatarBattle(content, s);
    expect(b.kind).toBe('boss');
    expect(b.enemy.team[0]!.m.species).toBe('avatar');
    const won: BattleState = { ...b, outcome: 'won' };
    const { state, rewards } = finishBattle(content, s, won, createRng(1));
    expect(state.avatarBeaten).toBe(true);
    expect(rewards.gems).toBe(0);
  });
});
