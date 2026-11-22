// Visible wild monsters (designer, Round 62): where they appear, how they wander, how big they look,
// and that walking into one battles exactly that monster.
import { describe, expect, it } from 'vitest';
import { startWildEncounter } from '../../../src/logic/encounter';
import { activeOf } from '../../../src/logic/battle';
import { newGame } from '../../../src/logic/game';
import { createRng } from '../../../src/logic/rng';
import { DEFAULT_ENCOUNTER_RATE } from '../../../src/logic/encounterRate';
import { mapSpriteSize, sameTile, spawnWalker, SURPRISE_ENCOUNTER_RATE, wanderStep, WALKERS, type Tile } from '../../../src/logic/wildWalkers';
import { realContent } from '../helpers';

const content = realContent();
const grid = (w: number, h: number): Tile[] => Array.from({ length: w * h }, (_, i) => ({ x: i % w, y: Math.floor(i / w) }));

describe('spawning a visible wild monster', () => {
  it('appears on free ground, far enough from the player, with a monster from that biome', () => {
    const ground = grid(10, 10);
    const forest = new Set(content.monsters.filter((m) => m.biome === 'forest' && m.evolvesFrom === null).map((m) => m.id));
    for (let seed = 1; seed <= 40; seed++) {
      const taken = [{ x: 9, y: 9 }];
      const w = spawnWalker(content, 'forest', [10], ground, taken, { x: 0, y: 0 }, seed, createRng(seed))!;
      expect(w.id).toBe(seed);
      expect(forest.has(w.spawn.species)).toBe(true);
      expect(Math.abs(w.tile.x) + Math.abs(w.tile.y)).toBeGreaterThanOrEqual(WALKERS.minSpawnDistance);
      expect(sameTile(w.tile, taken[0]!)).toBe(false);
    }
  });

  it('returns null when there is no room', () => {
    const ground = [{ x: 0, y: 1 }];
    expect(spawnWalker(content, 'forest', [], ground, [], { x: 0, y: 0 }, 1, createRng(1))).toBeNull();
    expect(spawnWalker(content, 'forest', [], [{ x: 9, y: 9 }], [{ x: 9, y: 9 }], { x: 0, y: 0 }, 1, createRng(1))).toBeNull();
  });
});

describe('wandering', () => {
  it('steps one tile onto allowed ground, or rests', () => {
    const allowed = new Set(['5,4', '6,5']);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const t = wanderStep({ x: 5, y: 5 }, (n) => allowed.has(`${n.x},${n.y}`), createRng(seed));
      seen.add(`${t.x},${t.y}`);
    }
    expect([...seen].sort()).toEqual(['5,4', '5,5', '6,5']);
  });

  it('stays put when boxed in', () => {
    expect(wanderStep({ x: 2, y: 2 }, () => false, createRng(3))).toEqual({ x: 2, y: 2 });
  });
});

describe('how big they look on the map', () => {
  it('squeezes "N x Dumble" like in battle, within 22 to 64 px', () => {
    expect(mapSpriteSize(1, false)).toBe(26);
    expect(mapSpriteSize(4, false)).toBe(52);
    expect(mapSpriteSize(10, false)).toBe(64);
    expect(mapSpriteSize(0.25, false)).toBe(22);
  });

  it('Big Monsters are 1.5x bigger (no star, Round 62)', () => {
    expect(mapSpriteSize(1, true)).toBe(39);
    expect(mapSpriteSize(2, true)).toBeGreaterThan(mapSpriteSize(2, false));
  });
});

describe('battling the monster you walked into', () => {
  it('uses exactly that species, level and Big', () => {
    const state = newGame(content, 'forest', 1);
    const { battle, state: next } = startWildEncounter(content, state, 'forest', createRng(5), { species: 'hootle', level: 7, big: true });
    const wild = activeOf(battle.enemy)!.m;
    expect([wild.species, wild.level, wild.big]).toEqual(['hootle', 7, true]);
    expect(next.seen).toContain('hootle');
  });

  it('a hidden surprise still rolls its own monster', () => {
    const { battle } = startWildEncounter(content, newGame(content, 'forest', 1), 'forest', createRng(5));
    expect(activeOf(battle.enemy)!.m.species).toBeTruthy();
  });

  it('surprises are rarer than before (some surprises stay)', () => {
    expect(SURPRISE_ENCOUNTER_RATE.chance).toBeGreaterThan(0);
    expect(SURPRISE_ENCOUNTER_RATE.chance).toBeLessThan(DEFAULT_ENCOUNTER_RATE.chance);
  });
});
