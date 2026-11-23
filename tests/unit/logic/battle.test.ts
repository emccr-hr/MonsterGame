import { describe, expect, it } from 'vitest';
import type { Content } from '../../../src/data/schema';
import {
  activeOf,
  baseDamage,
  invalidReason,
  resolveTurn,
  startBattle,
  type Action,
  type BattleEvent,
  type BattleState,
} from '../../../src/logic/battle';
import { maxHp, type MonsterInstance } from '../../../src/logic/monster';
import { createRng, type Rng } from '../../../src/logic/rng';
import { mon, realContent, scriptedRng } from '../helpers';

// Rng shortcuts: YES makes every chance succeed (and picks the first item, lowest damage spread);
// NO makes every chance fail (last item, highest spread).
const YES = () => scriptedRng([], 0);
const NO = () => scriptedRng([], 0.999);

const content = realContent();
const bag = { cage: 10, potion: 2, 'wake-up-snack': 1 };

function battle(player: MonsterInstance[], enemy: MonsterInstance, kind: 'wild' | 'boss' = 'wild'): BattleState {
  return startBattle(kind, player, enemy, bag);
}

function turn(s: BattleState, action: Action, rng: Rng = NO(), c: Content = content) {
  return resolveTurn(c, s, action, rng);
}

const use = (move: string): Action => ({ kind: 'move', move });
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) =>
  events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);

describe('starting a battle', () => {
  it('leads with the first awake team monster', () => {
    const a = mon(content, 'dumble', 5, { hp: 0 });
    const b = mon(content, 'peggy', 5);
    const s = battle([a, b], mon(content, 'blobbin', 5));
    expect(s.player.active).toBe(1);
    expect(s.outcome).toBeNull();
    expect(s.turn).toBe(1);
  });

  it('has no active monster before the first catch', () => {
    const s = battle([], mon(content, 'blobbin', 3));
    expect(s.player.active).toBe(-1);
    expect(activeOf(s.player)).toBeNull();
  });

  it('copies the monsters, so the battle never changes the saved team', () => {
    const me = mon(content, 'dumble', 5);
    const s = battle([me], mon(content, 'blobbin', 5));
    s.player.team[0]!.m.hp = 1;
    expect(me.hp).toBeGreaterThan(1);
  });
});

describe('which actions are allowed', () => {
  const s = battle([mon(content, 'dumble', 5), mon(content, 'peggy', 5, { hp: 0 })], mon(content, 'blobbin', 5));

  it('a move the monster knows', () => {
    expect(invalidReason(content, s, use('pinch'))).toBeNull();
    expect(invalidReason(content, s, use('lava-spit'))).toMatch(/doesn't know/);
  });

  it('switching only to another awake monster', () => {
    expect(invalidReason(content, s, { kind: 'switch', to: 0 })).toMatch(/already fighting/);
    expect(invalidReason(content, s, { kind: 'switch', to: 1 })).toMatch(/awake/);
    expect(invalidReason(content, s, { kind: 'switch', to: 7 })).toMatch(/awake/);
  });

  it('items only when they would do something', () => {
    expect(invalidReason(content, s, { kind: 'item', item: 'potion', target: 0 })).toMatch(/full HP/);
    expect(invalidReason(content, s, { kind: 'item', item: 'potion', target: 1 })).toMatch(/knocked-out/);
    expect(invalidReason(content, s, { kind: 'item', item: 'wake-up-snack', target: 1 })).toBeNull();
    expect(invalidReason(content, s, { kind: 'item', item: 'wake-up-snack', target: 0 })).toMatch(/awake already/);
    expect(invalidReason(content, s, { kind: 'item', item: 'teleport-pin', target: 0 })).toMatch(/don't have/);
  });

  it('cages and running only in wild battles', () => {
    const boss = battle([mon(content, 'dumble', 30)], mon(content, 'avatar', 30), 'boss');
    expect(invalidReason(content, s, { kind: 'cage' })).toBeNull();
    expect(invalidReason(content, s, { kind: 'run' })).toBeNull();
    expect(invalidReason(content, boss, { kind: 'cage' })).toMatch(/can't be caught/);
    expect(invalidReason(content, boss, { kind: 'run' })).toMatch(/can't run/);
  });

  it('no cage throws without cages', () => {
    const empty = startBattle('wild', [mon(content, 'dumble', 5)], mon(content, 'blobbin', 5), { cage: 0 });
    expect(invalidReason(content, empty, { kind: 'cage' })).toMatch(/out of cages/);
  });

  it('only a cage or running before the first catch', () => {
    const first = battle([], mon(content, 'blobbin', 3));
    expect(invalidReason(content, first, use('hit'))).toMatch(/Throw a cage/);
    expect(invalidReason(content, first, { kind: 'cage' })).toBeNull();
  });

  it('resolveTurn refuses an illegal action', () => {
    expect(() => turn(s, use('lava-spit'))).toThrow(/doesn't know/);
  });
});

describe('damage and turn order', () => {
  it('a damaging move lowers the other monster’s HP', () => {
    const s = battle([mon(content, 'dumble', 10)], mon(content, 'blobbin', 10, { moves: ['goop-throw'] }));
    const { state, events } = turn(s, use('bounce-attack'));
    const hit = ofType(events, 'damage').find((e) => e.side === 'enemy')!;
    expect(hit.amount).toBeGreaterThan(0);
    expect(activeOf(state.enemy)!.m.hp).toBe(maxHp(content, s.enemy.team[0]!.m) - hit.amount);
  });

  it('battles are short enough for kids: a Medium move takes 2 to 8 hits between equals', () => {
    for (const level of [5, 20, 50]) {
      const a = mon(content, 'cinderscale', level);
      const b = mon(content, 'cinderscale', level);
      const s = battle([a], b);
      const dmg = baseDamage(content, s.player.team[0]!, s.enemy.team[0]!, content.moves.find((m) => m.id === 'bite')!, false, NO());
      const hits = Math.ceil(maxHp(content, b) / dmg);
      expect(hits, `level ${level}`).toBeGreaterThanOrEqual(2);
      expect(hits, `level ${level}`).toBeLessThanOrEqual(8);
    }
  });

  it('stronger power words do more damage', () => {
    const s = battle([mon(content, 'camelump', 20)], mon(content, 'yeti', 20));
    const dmg = (id: string) => baseDamage(content, s.player.team[0]!, s.enemy.team[0]!, content.moves.find((m) => m.id === id)!, false, NO());
    expect(dmg('stomp')).toBeGreaterThan(dmg('bite'));
    expect(dmg('bite')).toBeGreaterThan(dmg('hit'));
  });

  it('higher level does more damage', () => {
    const lo = battle([mon(content, 'yeti', 10)], mon(content, 'yeti', 30));
    const hi = battle([mon(content, 'yeti', 30)], mon(content, 'yeti', 30));
    const bite = content.moves.find((m) => m.id === 'bite')!;
    expect(baseDamage(content, hi.player.team[0]!, hi.enemy.team[0]!, bite, false, NO())).toBeGreaterThan(
      baseDamage(content, lo.player.team[0]!, lo.enemy.team[0]!, bite, false, NO()),
    );
  });

  it('the faster monster moves first', () => {
    // Bushtail (Quick) aside, pick two plain monsters with different speed: Ashflap 56 > Camelump 44.
    const s = battle([mon(content, 'camelump', 10)], mon(content, 'ashflap', 10, { moves: ['hit'] }));
    const { events } = turn(s, use('hit'));
    expect(ofType(events, 'move')[0]!.side).toBe('enemy');
  });

  it('Quick always goes first, even when slower', () => {
    // Stingtail (Quick, speed 50) vs Ashflap (speed 56).
    const s = battle([mon(content, 'stingtail', 10)], mon(content, 'ashflap', 10, { moves: ['hit'] }));
    const { events } = turn(s, use('sting'));
    expect(ofType(events, 'move')[0]!.side).toBe('player');
  });

  it('a knocked-out monster does not get to attack later in the turn', () => {
    const s = battle([mon(content, 'stingtail', 50)], mon(content, 'dumble', 2, { moves: ['hit'] }));
    const { state, events } = turn(s, use('dig'));
    expect(state.outcome).toBeNull(); // Dig goes underground first
    const r2 = turn(state, use('dig'));
    expect(r2.state.outcome).toBe('won');
    expect(ofType(r2.events, 'move').filter((e) => e.side === 'enemy')).toHaveLength(0);
    expect(events.length).toBeGreaterThan(0);
  });

  it('Avatar’s moves hit 30% harder', () => {
    const s = battle([mon(content, 'dumble', 30)], mon(content, 'avatar', 30), 'boss');
    const splash = content.moves.find((m) => m.id === 'splash')!;
    const plain = baseDamage(content, s.enemy.team[0]!, s.player.team[0]!, splash, false, NO());
    const boss = baseDamage(content, s.enemy.team[0]!, s.player.team[0]!, splash, true, NO());
    expect(boss / plain).toBeCloseTo(1.3, 1);
  });

  it('damage has a small random spread', () => {
    const s = battle([mon(content, 'yeti', 20)], mon(content, 'yeti', 20));
    const bite = content.moves.find((m) => m.id === 'bite')!;
    const low = baseDamage(content, s.player.team[0]!, s.enemy.team[0]!, bite, false, YES());
    const high = baseDamage(content, s.player.team[0]!, s.enemy.team[0]!, bite, false, NO());
    expect(low).toBeLessThan(high);
    expect(low / high).toBeGreaterThan(0.84);
  });
});

describe('abilities', () => {
  it('Slippery: attacks sometimes miss it', () => {
    const s = battle([mon(content, 'hootle', 10)], mon(content, 'pengwiggle', 10, { moves: ['peck'] }));
    const { events } = turn(s, use('peck'), YES());
    expect(ofType(events, 'miss')).toContainEqual({ type: 'miss', side: 'enemy', reason: 'slippery' });
  });

  it('Hit always hits, even a Slippery monster', () => {
    const s = battle([mon(content, 'hootle', 10)], mon(content, 'pengwiggle', 10, { moves: ['peck'] }));
    const { events } = turn(s, use('hit'), YES());
    expect(ofType(events, 'damage').some((e) => e.side === 'enemy')).toBe(true);
  });

  it('Lava Skin: fire moves sometimes do nothing', () => {
    const s = battle([mon(content, 'cinderscale', 10)], mon(content, 'blobbin', 10, { moves: ['hit'] }));
    const yes = turn(s, use('burn'), YES());
    expect(ofType(yes.events, 'miss')).toContainEqual({ type: 'miss', side: 'enemy', reason: 'lavaSkin' });
    expect(activeOf(yes.state.enemy)!.m.burned).toBe(0);
    const no = turn(s, use('burn'), NO());
    expect(ofType(no.events, 'damage').some((e) => e.side === 'enemy')).toBe(true);
  });

  it('Lava Skin ignores only fire moves', () => {
    const s = battle([mon(content, 'cinderscale', 10)], mon(content, 'blobbin', 10, { moves: ['hit'] }));
    const { events } = turn(s, use('bite'), YES());
    expect(ofType(events, 'miss')).toHaveLength(0);
  });

  it('Not at this restaurant: Eat does nothing to Dumble', () => {
    const s = battle([mon(content, 'bushtail', 10, { hp: 10 })], mon(content, 'dumble', 10, { moves: ['hit'] }));
    const { events } = turn(s, use('eat'));
    expect(ofType(events, 'miss')).toContainEqual({ type: 'miss', side: 'enemy', reason: 'immune' });
    expect(ofType(events, 'heal').filter((e) => e.side === 'player')).toHaveLength(0);
  });

  it('Colony Bond: a red ant will not attack another red ant', () => {
    const s = battle([mon(content, 'anti-ant', 20)], mon(content, 'queen-ant', 20, { moves: ['bite'] }));
    const { state, events } = turn(s, use('sting'));
    expect(ofType(events, 'miss').map((e) => e.reason)).toEqual(['colony', 'colony']);
    expect(activeOf(state.enemy)!.m.hp).toBe(maxHp(content, state.enemy.team[0]!.m));
  });

  it('Colony Bond does not stop other monsters', () => {
    const s = battle([mon(content, 'stingtail', 20)], mon(content, 'queen-ant', 20, { moves: ['bite'] }));
    const { events } = turn(s, use('sting'));
    expect(ofType(events, 'damage').some((e) => e.side === 'enemy')).toBe(true);
  });

  it('Wise: takes 10% less damage', () => {
    const plain = realContent();
    const wise = realContent();
    wise.monsters.find((m) => m.id === 'stingtail')!.ability = 'wise';
    const run = (c: Content) => {
      const s = startBattle('wild', [mon(c, 'camelump', 20)], mon(c, 'stingtail', 20, { moves: ['fetch'] }), bag);
      return ofType(resolveTurn(c, s, use('stomp'), NO()).events, 'damage').find((e) => e.side === 'enemy')!.amount;
    };
    const ratio = run(wise) / run(plain);
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(0.95);
  });

  it('Cute: the other monster sometimes forgets to attack', () => {
    const s = battle([mon(content, 'dumble', 10)], mon(content, 'peggy', 10, { moves: ['lick'] }));
    const { events } = turn(s, use('pinch'), YES());
    expect(ofType(events, 'skip')).toContainEqual({ type: 'skip', side: 'player', reason: 'cute' });
  });

  it('Fur Coat: never frozen', () => {
    const s = battle([mon(content, 'frostpaw', 10)], mon(content, 'yeti', 10, { moves: ['bite'] }));
    const { state, events } = turn(s, use('freeze'), YES());
    expect(ofType(events, 'status')).toHaveLength(0);
    expect(activeOf(state.enemy)!.frozen).toBe(false);
  });

  it('Water Storage: heals 5% at the end of each turn', () => {
    const camel = mon(content, 'camelump', 20);
    camel.hp = Math.floor(maxHp(content, camel) / 2);
    const s = battle([camel], mon(content, 'dumble', 20, { moves: ['fetch'] }));
    const { events } = turn(s, use('spit'));
    const heal = ofType(events, 'heal').find((e) => e.side === 'player')!;
    expect(heal.amount).toBe(Math.floor(maxHp(content, camel) * 0.05));
  });

  it('Snack Thief: Eat heals twice as much', () => {
    const plain = realContent();
    const thief = realContent();
    thief.monsters.find((m) => m.id === 'bushtail')!.ability = 'snack-thief';
    const run = (c: Content) => {
      const me = mon(c, 'bushtail', 20, { hp: 5 });
      const s = startBattle('wild', [me], mon(c, 'yeti', 20, { moves: ['fetch'] }), bag);
      const ev = resolveTurn(c, s, use('eat'), NO()).events;
      return { healed: ofType(ev, 'heal').find((e) => e.side === 'player')!.amount, dealt: ofType(ev, 'damage')[0]!.amount };
    };
    const p = run(plain);
    const t = run(thief);
    expect(p.healed).toBe(Math.floor(p.dealt * 0.5));
    expect(t.healed).toBe(Math.floor(t.dealt * 1));
  });
});

describe('Deep Freeze (Round 68)', () => {
  it('adds 15% to the freeze chance: a 0.35 roll misses Freeze (25%) but freezes with Deep Freeze (40%)', () => {
    const plain = realContent();
    const deep = realContent();
    deep.monsters.find((m) => m.id === 'frostpaw')!.ability = 'deep-freeze';
    const froze = (c: Content) => {
      const s = startBattle('wild', [mon(c, 'frostpaw', 10)], mon(c, 'dumble', 10, { moves: ['hit'] }), bag);
      return ofType(resolveTurn(c, s, use('freeze'), scriptedRng([], 0.35)).events, 'status').some((e) => e.status === 'frozen');
    };
    expect(froze(plain)).toBe(false);
    expect(froze(deep)).toBe(true);
  });

  it('does nothing for moves that never freeze', () => {
    const deep = realContent();
    deep.monsters.find((m) => m.id === 'frostpaw')!.ability = 'deep-freeze';
    const s = startBattle('wild', [mon(deep, 'frostpaw', 10)], mon(deep, 'dumble', 10, { moves: ['hit'] }), bag);
    expect(ofType(resolveTurn(deep, s, use('bite'), YES()).events, 'status')).toHaveLength(0);
  });
});

describe('statuses and special moves', () => {
  it('Burn: Burned for 2 turns, losing 10% max HP each turn, then it stops', () => {
    const s0 = battle([mon(content, 'cinderscale', 20)], mon(content, 'yeti', 20, { moves: ['fetch'] }));
    const r1 = turn(s0, use('burn'));
    expect(ofType(r1.events, 'status')).toContainEqual({ type: 'status', side: 'enemy', status: 'burned' });
    const max = maxHp(content, s0.enemy.team[0]!.m);
    expect(ofType(r1.events, 'burnHurt')).toEqual([{ type: 'burnHurt', side: 'enemy', amount: Math.floor(max * 0.1), hp: expect.any(Number) }]);
    const r2 = turn(r1.state, use('bite'));
    expect(ofType(r2.events, 'burnHurt')).toHaveLength(1);
    const r3 = turn(r2.state, use('bite'));
    expect(ofType(r3.events, 'burnHurt')).toHaveLength(0);
    expect(activeOf(r3.state.enemy)!.m.burned).toBe(0);
  });

  it('Freeze: a frozen monster skips its next action', () => {
    const s = battle([mon(content, 'frostpaw', 10)], mon(content, 'dumble', 10, { moves: ['hit'] }));
    // Frostpaw (Quick) freezes first; the 0 roll makes the 25% freeze happen.
    const r1 = turn(s, use('freeze'), YES());
    expect(ofType(r1.events, 'status')).toContainEqual({ type: 'status', side: 'enemy', status: 'frozen' });
    expect(ofType(r1.events, 'skip')).toContainEqual({ type: 'skip', side: 'enemy', reason: 'frozen' });
    // Thawed now: next turn it attacks again.
    const r2 = turn(r1.state, use('bite'), NO());
    expect(ofType(r2.events, 'move').some((e) => e.side === 'enemy')).toBe(true);
  });

  it('Freeze: no freeze when the 25% roll fails', () => {
    const s = battle([mon(content, 'frostpaw', 10)], mon(content, 'dumble', 10, { moves: ['hit'] }));
    expect(ofType(turn(s, use('freeze'), NO()).events, 'status')).toHaveLength(0);
  });

  it('Dig: underground for a turn (attacks miss), then it attacks', () => {
    const s = battle([mon(content, 'stingtail', 20)], mon(content, 'yeti', 20, { moves: ['bite'] }));
    const r1 = turn(s, use('dig'));
    expect(ofType(r1.events, 'dig')).toHaveLength(1);
    expect(ofType(r1.events, 'miss')).toContainEqual({ type: 'miss', side: 'player', reason: 'underground' });
    expect(ofType(r1.events, 'damage').filter((e) => e.side === 'enemy')).toHaveLength(0);
    // Whatever the player picks next, the dig attack lands.
    const r2 = turn(r1.state, use('sting'));
    expect(ofType(r2.events, 'move').find((e) => e.side === 'player')!.move).toBe('dig');
    expect(ofType(r2.events, 'damage').some((e) => e.side === 'enemy')).toBe(true);
    expect(activeOf(r2.state.player)!.digging).toBe(false);
  });

  it('Fetch: +20% attack per use, up to 2 times', () => {
    const s = battle([mon(content, 'scout', 30)], mon(content, 'yeti', 30, { moves: ['fetch'] }));
    const r1 = turn(s, use('fetch'));
    const r2 = turn(r1.state, use('fetch'));
    const r3 = turn(r2.state, use('fetch'));
    expect(ofType(r1.events, 'boost')[0]!.stacks).toBe(1);
    expect(ofType(r3.events, 'boost')[0]!.stacks).toBe(2);
    const bite = content.moves.find((m) => m.id === 'bite')!;
    const before = baseDamage(content, s.player.team[0]!, s.enemy.team[0]!, bite, false, NO());
    const after = baseDamage(content, r3.state.player.team[0]!, r3.state.enemy.team[0]!, bite, false, NO());
    expect(after / before).toBeCloseTo(1.4, 1);
  });

  it('Fetch resets when the monster switches out', () => {
    const s = battle([mon(content, 'scout', 30), mon(content, 'dumble', 30)], mon(content, 'yeti', 30, { moves: ['fetch'] }));
    const r1 = turn(s, use('fetch'));
    const r2 = turn(r1.state, { kind: 'switch', to: 1 });
    expect(r2.state.player.team[0]!.boost).toBe(0);
  });

  it('Eat heals half the damage dealt', () => {
    const s = battle([mon(content, 'bushtail', 20, { hp: 5 })], mon(content, 'yeti', 20, { moves: ['fetch'] }));
    const { events } = turn(s, use('eat'));
    const dealt = ofType(events, 'damage')[0]!.amount;
    expect(ofType(events, 'heal')[0]!.amount).toBe(Math.floor(dealt * 0.5));
  });

  it('Sleep heals half and skips the next turn', () => {
    const peggy = mon(content, 'peggy', 20, { hp: 10 });
    const s = battle([peggy], mon(content, 'yeti', 20, { moves: ['fetch'] }));
    const r1 = turn(s, use('sleep'), NO());
    expect(ofType(r1.events, 'heal')[0]!.amount).toBe(Math.floor(maxHp(content, peggy) * 0.5));
    const r2 = turn(r1.state, use('bite'), NO());
    expect(ofType(r2.events, 'skip')).toContainEqual({ type: 'skip', side: 'player', reason: 'sleeping' });
    expect(ofType(r2.events, 'damage').filter((e) => e.side === 'enemy')).toHaveLength(0);
  });

  it('Popsicle heals 25%', () => {
    const snow = mon(content, 'abominable-snowman', 45, { hp: 10 });
    const s = battle([snow], mon(content, 'yeti', 45, { moves: ['fetch'] }));
    const { events } = turn(s, use('popsicle'));
    expect(ofType(events, 'heal')[0]!.amount).toBe(Math.floor(maxHp(content, snow) * 0.25));
  });

  it('Protect the Queen heals the other awake team monsters', () => {
    const queen = mon(content, 'queen-ant', 20);
    const hurt = mon(content, 'dumble', 20, { hp: 5 });
    const out = mon(content, 'peggy', 20, { hp: 0 });
    const s = battle([queen, hurt, out], mon(content, 'yeti', 20, { moves: ['fetch'] }));
    const { state, events } = turn(s, use('protect-the-queen'));
    const heals = ofType(events, 'heal');
    expect(heals.map((h) => h.index)).toEqual([1]);
    expect(heals[0]!.amount).toBe(Math.floor(maxHp(content, hurt) * 0.25));
    expect(state.player.team[2]!.m.hp).toBe(0);
  });

  it('Slobber weakens the other monster’s next attack by 30%, once', () => {
    const s = battle([mon(content, 'peggy', 20)], mon(content, 'camelump', 20, { moves: ['stomp'] }));
    const r1 = turn(s, use('slobber'), NO());
    expect(ofType(r1.events, 'weakened')).toEqual([{ type: 'weakened', side: 'enemy' }]);
    // Peggy (speed 50) is faster than Camelump (44), so the stomp this turn was already weakened.
    expect(activeOf(r1.state.enemy)!.weakened).toBe(0);
    const weakHit = ofType(r1.events, 'damage').find((e) => e.side === 'player')!.amount;
    const r2 = turn(r1.state, use('lick'), NO());
    const fullHit = ofType(r2.events, 'damage').find((e) => e.side === 'player')!.amount;
    expect(weakHit / fullHit).toBeGreaterThan(0.6);
    expect(weakHit / fullHit).toBeLessThan(0.8);
  });

  it('Screech weakens without doing damage', () => {
    const s = battle([mon(content, 'ashflap', 20)], mon(content, 'camelump', 20, { moves: ['fetch'] }));
    const { events } = turn(s, use('screech'));
    expect(ofType(events, 'weakened')).toHaveLength(1);
    expect(ofType(events, 'damage')).toHaveLength(0);
  });
});

describe('knock-outs, switching and the end of a battle', () => {
  it('winning: knocking out the wild monster', () => {
    const s = battle([mon(content, 'moltenmaw', 60)], mon(content, 'dumble', 2, { moves: ['hit'] }));
    const { state, events } = turn(s, use('magma-slam'));
    expect(state.outcome).toBe('won');
    expect(events.at(-1)).toEqual({ type: 'end', outcome: 'won' });
  });

  it('a knocked-out monster means picking the next one, for free', () => {
    const weak = mon(content, 'dumble', 2);
    const s = battle([weak, mon(content, 'peggy', 20)], mon(content, 'moltenmaw', 60, { moves: ['magma-slam'] }));
    const r1 = turn(s, use('hit'));
    expect(r1.state.mustSwitch).toBe(true);
    expect(r1.state.outcome).toBeNull();
    expect(invalidReason(content, r1.state, use('hit'))).toMatch(/next monster/);
    const r2 = turn(r1.state, { kind: 'switch', to: 1 });
    expect(r2.state.mustSwitch).toBe(false);
    expect(r2.state.player.active).toBe(1);
    expect(r2.state.turn).toBe(r1.state.turn); // no turn passed
    expect(ofType(r2.events, 'move')).toHaveLength(0);
  });

  it('losing: every team monster knocked out', () => {
    const s = battle([mon(content, 'dumble', 2)], mon(content, 'moltenmaw', 60, { moves: ['magma-slam'] }));
    const { state } = turn(s, use('hit'));
    expect(state.outcome).toBe('lost');
    expect(state.mustSwitch).toBe(false);
  });

  it('switching uses the turn: the enemy still attacks', () => {
    const s = battle([mon(content, 'dumble', 10), mon(content, 'peggy', 10)], mon(content, 'yeti', 10, { moves: ['bite'] }));
    const { state, events } = turn(s, { kind: 'switch', to: 1 });
    expect(state.player.active).toBe(1);
    expect(ofType(events, 'damage').find((e) => e.side === 'player')).toBeDefined();
  });

  it('running away from a wild battle', () => {
    const s = battle([mon(content, 'dumble', 10)], mon(content, 'yeti', 10));
    const { state, events } = turn(s, { kind: 'run' });
    expect(state.outcome).toBe('ran');
    expect(events).toEqual([{ type: 'end', outcome: 'ran' }]);
  });

  it('no more actions after the battle ends', () => {
    const s = battle([mon(content, 'dumble', 10)], mon(content, 'yeti', 10));
    const done = turn(s, { kind: 'run' }).state;
    expect(invalidReason(content, done, use('hit'))).toMatch(/over/);
  });
});

describe('cages in battle', () => {
  it('a good throw catches the monster and uses a cage', () => {
    const s = battle([mon(content, 'dumble', 10)], mon(content, 'yeti', 10));
    const { state, events } = turn(s, { kind: 'cage' }, YES());
    expect(state.outcome).toBe('caught');
    expect(state.bag.cage).toBe(9);
    expect(ofType(events, 'throw')[0]!.throw.result).toBe('caught');
  });

  it('a missed throw: the battle goes on and the wild monster attacks', () => {
    const s = battle([mon(content, 'dumble', 10)], mon(content, 'yeti', 10, { moves: ['bite'] }));
    const { state, events } = turn(s, { kind: 'cage' }, NO());
    expect(state.outcome).toBeNull();
    expect(state.failedThrows).toBe(1);
    expect(ofType(events, 'damage').some((e) => e.side === 'player')).toBe(true);
  });

  it('after 3 missed throws the wild monster runs away', () => {
    let s = battle([mon(content, 'dumble', 30)], mon(content, 'yeti', 5, { moves: ['fetch'] }));
    for (let i = 0; i < 3; i++) s = turn(s, { kind: 'cage' }, NO()).state;
    expect(s.outcome).toBe('fled');
    expect(s.bag.cage).toBe(7);
  });

  it('the first catch: no team, the wild monster does not attack', () => {
    const s = battle([], mon(content, 'blobbin', 3, { moves: ['bite'] }));
    const miss = turn(s, { kind: 'cage' }, NO());
    expect(miss.state.outcome).toBeNull();
    expect(ofType(miss.events, 'move')).toHaveLength(0);
    const hit = turn(miss.state, { kind: 'cage' }, YES());
    expect(hit.state.outcome).toBe('caught');
  });

  it('a knocked-out wild monster can’t be caught (the battle is already won)', () => {
    const s = battle([mon(content, 'moltenmaw', 60)], mon(content, 'dumble', 2, { moves: ['hit'] }));
    const won = turn(s, use('magma-slam')).state;
    expect(invalidReason(content, won, { kind: 'cage' })).toMatch(/over/);
  });
});

describe('items in battle', () => {
  it('a potion heals 20 HP and uses the potion', () => {
    const me = mon(content, 'yeti', 30);
    me.hp = 10;
    const s = battle([me], mon(content, 'dumble', 30, { moves: ['fetch'] }));
    const { state } = turn(s, { kind: 'item', item: 'potion', target: 0 });
    expect(state.player.team[0]!.m.hp).toBe(30);
    expect(state.bag.potion).toBe(1);
  });

  it('a Wake-Up Snack brings back a knocked-out team monster at half HP', () => {
    const out = mon(content, 'peggy', 20, { hp: 0, burned: 2 });
    const s = battle([mon(content, 'yeti', 20), out], mon(content, 'dumble', 20, { moves: ['fetch'] }));
    const { state } = turn(s, { kind: 'item', item: 'wake-up-snack', target: 1 });
    expect(state.player.team[1]!.m.hp).toBe(Math.floor(maxHp(content, out) / 2));
    expect(state.player.team[1]!.m.burned).toBe(0);
    expect(state.bag['wake-up-snack']).toBe(0);
  });
});

describe('rules for the whole engine', () => {
  it('never changes the state it was given', () => {
    const s = battle([mon(content, 'cinderscale', 20)], mon(content, 'yeti', 20));
    const copy = structuredClone(s);
    turn(s, use('burn'), createRng(1));
    expect(s).toEqual(copy);
  });

  it('is deterministic: same seed, same battle', () => {
    const s = battle([mon(content, 'cinderscale', 20)], mon(content, 'yeti', 20));
    expect(turn(s, use('burn'), createRng(7))).toEqual(turn(s, use('burn'), createRng(7)));
  });

  /** A simple player: random moves (heals only when hurt); in a red-ant standoff (Colony Bond both ways) switch, or run. */
  function kidAction(s: BattleState, rng: Rng): Action {
    if (s.mustSwitch) return { kind: 'switch', to: s.player.team.findIndex((c) => c.m.hp > 0) };
    const me = activeOf(s.player)!;
    const ant = (id: string) => content.monsters.find((m) => m.id === id)!.traits.includes('red-ant');
    if (ant(me.m.species) && ant(activeOf(s.enemy)!.m.species)) {
      const other = s.player.team.findIndex((c, i) => i !== s.player.active && c.m.hp > 0 && !ant(c.m.species));
      return other >= 0 ? { kind: 'switch', to: other } : { kind: 'run' };
    }
    // Like a kid: heal only when hurt (otherwise two healers can trade heals forever).
    const hurt = me.m.hp < maxHp(content, me.m) / 2;
    const attacks = me.m.moves.filter((id) => content.moves.find((m) => m.id === id)!.power !== 'none');
    return { kind: 'move', move: rng.pick(hurt || attacks.length === 0 ? me.m.moves : attacks) };
  }

  it('red ants never fight each other: neither side can hurt the other', () => {
    const s = battle([mon(content, 'anti-ant', 20)], mon(content, 'anti-ant', 20, { moves: ['bite'] }));
    let state = s;
    for (let i = 0; i < 5; i++) state = turn(state, use('bite'), createRng(i)).state;
    expect(state.player.team[0]!.m.hp).toBe(s.player.team[0]!.m.hp);
    expect(state.enemy.team[0]!.m.hp).toBe(s.enemy.team[0]!.m.hp);
  });

  it('every battle ends: 300 random battles between random monsters finish in under 60 turns', () => {
    const rng = createRng(2026);
    const wild = content.monsters.filter((m) => m.kind === 'monster');
    let totalTurns = 0;
    for (let i = 0; i < 300; i++) {
      const level = rng.int(2, 60);
      const team = [0, 1, 2].map(() => mon(content, rng.pick(wild).id, level + rng.int(-3, 3)));
      let s = battle(team, mon(content, rng.pick(wild).id, level));
      let turns = 0;
      while (!s.outcome && turns < 60) {
        s = resolveTurn(content, s, kidAction(s, rng), rng).state;
        turns++;
      }
      expect(s.outcome, `battle ${i}`).not.toBeNull();
      totalTurns += turns;
    }
    // Kid-friendly pace: battles between equals average well under 15 turns.
    expect(totalTurns / 300).toBeLessThan(15);
  });

  it('Avatar can be beaten by a strong team and not by a weak one (at its real level)', () => {
    const play = (level: number, seed: number) => {
      const rng = createRng(seed);
      const team = ['moltenmaw', 'abominable-snowman', 'triplump', 'boulderclaw', 'scout', 'dunestinger'].map((id) => mon(content, id, level));
      // Same rule as encounter.avatarLevel: the team's best level + 5, at least 30.
      let s = battle(team, mon(content, 'avatar', Math.max(30, level + 5)), 'boss');
      for (let t = 0; t < 300 && !s.outcome; t++) s = resolveTurn(content, s, kidAction(s, rng), rng).state;
      return s.outcome;
    };
    const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
    const strongWins = seeds.filter((seed) => play(45, seed) === 'won').length;
    const weakWins = seeds.filter((seed) => play(15, seed) === 'won').length;
    expect(strongWins).toBeGreaterThanOrEqual(14);
    expect(weakWins).toBeLessThanOrEqual(2);
  });
});
