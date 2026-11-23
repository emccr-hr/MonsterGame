import { describe, expect, it } from 'vitest';
import { mon, realContent, scriptedRng } from '../helpers';
import { newGame, type GameState, type Result } from '../../../src/logic/game';
import { maxHp } from '../../../src/logic/monster';
import {
  AVATAR_ARENA,
  addGems,
  buy,
  buyMapPart,
  canTeleport,
  gateProgress,
  lockedBiomes,
  placePin,
  removePin,
  teleportSpots,
  useHealingItem,
  useReviver,
  wildBattleGems,
} from '../../../src/logic/world';

const content = realContent();
const fresh = (): GameState => newGame(content, 'forest', 1);

function expectOk(r: Result<GameState>): GameState {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

function withTeam(...team: ReturnType<typeof mon>[]): GameState {
  return { ...fresh(), team };
}

describe('buy', () => {
  it('takes the gems and adds the items', () => {
    const s = expectOk(buy(content, fresh(), 'potion', 2));
    expect(s.gems).toBe(100 - 30);
    expect(s.bag.potion).toBe(2);
  });

  it('buys one by default', () => {
    const s = expectOk(buy(content, fresh(), 'cage'));
    expect(s.bag.cage).toBe(101);
    expect(s.gems).toBe(90);
  });

  it('lets you spend every gem', () => {
    const s = expectOk(buy(content, fresh(), 'teleport-pin'));
    expect(s.gems).toBe(0);
  });

  it('refuses when you do not have enough gems', () => {
    const r = buy(content, fresh(), 'potion', 7);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/105/);
  });

  it('refuses quantity below 1 or not a whole number', () => {
    expect(buy(content, fresh(), 'potion', 0).ok).toBe(false);
    expect(buy(content, fresh(), 'potion', -1).ok).toBe(false);
    expect(buy(content, fresh(), 'potion', 1.5).ok).toBe(false);
  });

  it('refuses the map part', () => {
    expect(buy(content, fresh(), 'map-part').ok).toBe(false);
  });

  it('throws for an unknown item', () => {
    expect(() => buy(content, fresh(), 'sword')).toThrow(/Unknown item/);
  });

  it('does not change the old state', () => {
    const s = fresh();
    const copy = structuredClone(s);
    buy(content, s, 'potion', 2);
    expect(s).toEqual(copy);
  });
});

describe('buyMapPart and lockedBiomes', () => {
  it('opens the biome and costs 50 gems', () => {
    const s = expectOk(buyMapPart(content, fresh(), 'beach'));
    expect(s.openBiomes).toEqual(['forest', 'beach']);
    expect(s.gems).toBe(50);
  });

  it('refuses a biome that is already open', () => {
    expect(buyMapPart(content, fresh(), 'forest').ok).toBe(false);
  });

  it('refuses an unknown biome', () => {
    expect(buyMapPart(content, fresh(), 'moon').ok).toBe(false);
  });

  it('refuses with too few gems', () => {
    expect(buyMapPart(content, { ...fresh(), gems: 49 }, 'beach').ok).toBe(false);
  });

  it('lists the hidden biomes', () => {
    expect(lockedBiomes(content, fresh())).toEqual(['beach', 'desert', 'snowy', 'volcano']);
    const s = expectOk(buyMapPart(content, fresh(), 'snowy'));
    expect(lockedBiomes(content, s)).toEqual(['beach', 'desert', 'volcano']);
  });
});

describe('gems', () => {
  it('addGems adds a whole, non-negative amount', () => {
    expect(addGems(fresh(), 10).gems).toBe(110);
    expect(addGems(fresh(), -10).gems).toBe(100);
    expect(addGems(fresh(), 2.9).gems).toBe(102);
  });

  it('wildBattleGems stays between 5 and 10', () => {
    expect(wildBattleGems(content, scriptedRng([0]))).toBe(5);
    expect(wildBattleGems(content, scriptedRng([0.999]))).toBe(10);
  });
});

describe('useReviver', () => {
  it('heals team and backpack to full, wakes monsters and clears Burned', () => {
    const a = mon(content, 'bushtail', 10, { hp: 0, burned: 2 });
    const b = mon(content, 'peggy', 10, { hp: 1 });
    const c = mon(content, 'hootle', 10, { hp: 2, burned: 3 });
    const s = { ...withTeam(a, b), backpack: [c] };
    const next = useReviver(content, s, 'forest');
    for (const m of [...next.team, ...next.backpack]) {
      expect(m.hp).toBe(maxHp(content, m));
      expect(m.burned).toBe(0);
    }
  });

  it('sets the last reviver', () => {
    expect(useReviver(content, fresh(), 'forest').lastReviver).toBe('forest');
    expect(useReviver(content, fresh(), 'ansonville').lastReviver).toBe('ansonville');
  });

  it('does not change the old state', () => {
    const s = withTeam(mon(content, 'bushtail', 10, { hp: 0 }));
    const copy = structuredClone(s);
    useReviver(content, s, 'forest');
    expect(s).toEqual(copy);
  });
});

describe('useHealingItem: potion', () => {
  const hurt = () => {
    const m = mon(content, 'bushtail', 20);
    return { m, state: { ...withTeam({ ...m, hp: 10 }), bag: { potion: 2 } } };
  };

  it('heals 20 HP and uses up one potion', () => {
    const { m, state } = hurt();
    const next = expectOk(useHealingItem(content, state, 'potion', m.uid));
    expect(next.team[0]!.hp).toBe(30);
    expect(next.bag.potion).toBe(1);
  });

  it('does not go over max HP', () => {
    const { m, state } = hurt();
    const nearlyFull = { ...state, team: [{ ...state.team[0]!, hp: maxHp(content, m) - 3 }] };
    const next = expectOk(useHealingItem(content, nearlyFull, 'potion', m.uid));
    expect(next.team[0]!.hp).toBe(maxHp(content, m));
  });

  it('refuses a knocked-out monster', () => {
    const { m, state } = hurt();
    const out = { ...state, team: [{ ...state.team[0]!, hp: 0 }] };
    expect(useHealingItem(content, out, 'potion', m.uid).ok).toBe(false);
  });

  it('refuses a monster with full HP and keeps the potion', () => {
    const m = mon(content, 'bushtail', 20);
    const s = { ...withTeam(m), bag: { potion: 1 } };
    expect(useHealingItem(content, s, 'potion', m.uid).ok).toBe(false);
  });

  it('refuses when you have none', () => {
    const { m, state } = hurt();
    expect(useHealingItem(content, { ...state, bag: {} }, 'potion', m.uid).ok).toBe(false);
  });

  it('refuses a monster that is not on the team', () => {
    const { state } = hurt();
    expect(useHealingItem(content, state, 'potion', 424242).ok).toBe(false);
  });

  it('does not change the old state', () => {
    const { m, state } = hurt();
    const copy = structuredClone(state);
    useHealingItem(content, state, 'potion', m.uid);
    expect(state).toEqual(copy);
  });
});

describe('useHealingItem: wake-up snack', () => {
  const out = () => {
    const m = mon(content, 'bushtail', 20);
    return { m, state: { ...withTeam({ ...m, hp: 0 }), bag: { 'wake-up-snack': 1 } } };
  };

  it('wakes a knocked-out monster with half its HP', () => {
    const { m, state } = out();
    const next = expectOk(useHealingItem(content, state, 'wake-up-snack', m.uid));
    expect(next.team[0]!.hp).toBe(Math.floor(maxHp(content, m) / 2));
    expect(next.bag['wake-up-snack']).toBe(0);
  });

  it('refuses an awake monster', () => {
    const m = mon(content, 'bushtail', 20, { hp: 5 });
    const s = { ...withTeam(m), bag: { 'wake-up-snack': 1 } };
    expect(useHealingItem(content, s, 'wake-up-snack', m.uid).ok).toBe(false);
  });

  it('refuses items that do not heal', () => {
    const { m, state } = out();
    expect(useHealingItem(content, { ...state, bag: { cage: 1 } }, 'cage', m.uid).ok).toBe(false);
  });
});

describe('gateProgress', () => {
  const wildIds = content.monsters.filter((m) => m.kind === 'monster' && m.spawnWeight !== null).map((m) => m.id);

  it('needs 22 species (Round 68) and starts at 0', () => {
    expect(gateProgress(content, fresh())).toEqual({ caught: 0, needed: 22, open: false });
  });

  it('counts caught base forms', () => {
    const s = { ...fresh(), caught: wildIds.slice(0, 4) };
    expect(gateProgress(content, s)).toEqual({ caught: 4, needed: 22, open: false });
  });

  it('does not count evolved forms', () => {
    const s = { ...fresh(), caught: ['treetail', 'slimy', 'queen-ant'] };
    expect(gateProgress(content, s).caught).toBe(0);
  });

  it('opens at 22 of 22', () => {
    const s = { ...fresh(), caught: wildIds };
    expect(gateProgress(content, s)).toEqual({ caught: 22, needed: 22, open: true });
  });

  it('stays closed at 21 of 22', () => {
    const s = { ...fresh(), caught: wildIds.slice(1) };
    expect(gateProgress(content, s).open).toBe(false);
  });
});

describe('teleporting', () => {
  const high = () => mon(content, 'bushtail', 50);
  const low = () => mon(content, 'bushtail', 49);

  it('needs a team monster at level 50 or more', () => {
    expect(canTeleport(content, withTeam(low()))).toBe(false);
    expect(canTeleport(content, withTeam(low(), high()))).toBe(true);
    expect(canTeleport(content, fresh())).toBe(false);
  });

  it('does not count a level 50 monster in the backpack', () => {
    expect(canTeleport(content, { ...withTeam(low()), backpack: [high()] })).toBe(false);
  });

  it('has no spots before level 50', () => {
    expect(teleportSpots(content, withTeam(low()))).toEqual({ shops: [], pins: [] });
  });

  it('lists Ansonville, open biomes and pins from level 50', () => {
    const s = { ...withTeam(high()), openBiomes: ['forest', 'beach'], pins: [{ id: 1, scene: 'forest', x: 1, y: 2 }] };
    expect(teleportSpots(content, s)).toEqual({ shops: ['ansonville', 'forest', 'beach'], pins: s.pins });
  });
});

describe('placePin and removePin', () => {
  const ready = (): GameState => ({ ...withTeam(mon(content, 'bushtail', 50)), bag: { 'teleport-pin': 3 } });

  it('places a pin and uses one up', () => {
    const s = expectOk(placePin(content, ready(), 'forest', 10, 20));
    expect(s.pins).toEqual([{ id: 1, scene: 'forest', x: 10, y: 20 }]);
    expect(s.bag['teleport-pin']).toBe(2);
  });

  it('gives each pin a new id', () => {
    const one = expectOk(placePin(content, ready(), 'forest', 1, 1));
    const two = expectOk(placePin(content, one, 'beach', 2, 2));
    expect(two.pins.map((p) => p.id)).toEqual([1, 2]);
  });

  it('needs a pin in the bag', () => {
    expect(placePin(content, { ...ready(), bag: {} }, 'forest', 1, 1).ok).toBe(false);
    expect(placePin(content, { ...ready(), bag: { 'teleport-pin': 0 } }, 'forest', 1, 1).ok).toBe(false);
  });

  it('needs a level 50 monster', () => {
    const s = { ...ready(), team: [mon(content, 'bushtail', 10)] };
    expect(placePin(content, s, 'forest', 1, 1).ok).toBe(false);
  });

  it('allows at most 5 placed', () => {
    const pins = [1, 2, 3, 4, 5].map((id) => ({ id, scene: 'forest', x: id, y: id }));
    expect(placePin(content, { ...ready(), pins }, 'forest', 1, 1).ok).toBe(false);
    expect(placePin(content, { ...ready(), pins: pins.slice(0, 4) }, 'forest', 1, 1).ok).toBe(true);
  });

  it('refuses the Avatar arena and keeps the pin', () => {
    const s = ready();
    expect(placePin(content, s, AVATAR_ARENA, 1, 1).ok).toBe(false);
    expect(s.bag['teleport-pin']).toBe(3);
  });

  it('removePin returns the pin to the bag', () => {
    const placed = expectOk(placePin(content, ready(), 'forest', 1, 1));
    const next = expectOk(removePin(content, placed, 1));
    expect(next.pins).toEqual([]);
    expect(next.bag['teleport-pin']).toBe(3);
  });

  it('removePin refuses an unknown pin', () => {
    expect(removePin(content, ready(), 99).ok).toBe(false);
  });

  it('does not change the old state', () => {
    const s = ready();
    const copy = structuredClone(s);
    const placed = expectOk(placePin(content, s, 'forest', 1, 1));
    removePin(content, placed, 1);
    expect(s).toEqual(copy);
  });
});
