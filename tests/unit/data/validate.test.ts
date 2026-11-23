import { describe, expect, it } from 'vitest';
import abilities from '../../../src/data/abilities.json';
import biomes from '../../../src/data/biomes.json';
import guide from '../../../src/data/guide.json';
import items from '../../../src/data/items.json';
import monsters from '../../../src/data/monsters.json';
import moves from '../../../src/data/moves.json';
import rules from '../../../src/data/rules.json';
import { gateMonsters, validateContent, type RawContent } from '../../../src/data/validate';

const real = (): RawContent => structuredClone({ monsters, moves, abilities, biomes, items, rules, guide });

/** Copy of the real data with one change, to prove each check catches its problem. */
function broken(change: (raw: { monsters: any[]; moves: any[]; abilities: any[]; biomes: any[]; items: any[]; rules: any; guide: any }) => void) {
  const raw = real() as any;
  change(raw);
  return validateContent(raw);
}

describe('the real game data', () => {
  const result = validateContent(real());

  it('passes every check', () => {
    expect(result.errors).toEqual([]);
    expect(result.content).toBeDefined();
  });

  it('matches the design docs: 64 monsters + Avatar, 32 wild (Rounds 64-69)', () => {
    const c = result.content!;
    expect(c.monsters.filter((m) => m.kind === 'monster')).toHaveLength(64);
    expect(c.monsters.filter((m) => m.kind === 'boss').map((m) => m.name)).toEqual(['Avatar']);
    expect(gateMonsters(c)).toHaveLength(32);
    // Spawn numbers are weights: Rounds 64, 66 and 67 added 20s to the Beach, Desert and Volcano and kept the other weights.
    const totals: Record<string, [number, number]> = { forest: [5, 140], beach: [7, 180], desert: [7, 180], snowy: [6, 150], volcano: [7, 180] };
    for (const b of c.biomes) {
      const wild = c.monsters.filter((m) => m.biome === b.id && m.spawnWeight !== null);
      expect(wild, b.id).toHaveLength(totals[b.id]![0]);
      expect(wild.reduce((sum, m) => sum + m.spawnWeight!, 0), b.id).toBe(totals[b.id]![1]);
    }
  });

  it('uses every move and ability at least once', () => {
    expect(result.warnings).toEqual([]);
  });

  it('gives Avatar its 5 element moves', () => {
    const avatar = result.content!.monsters.find((m) => m.id === 'avatar')!;
    expect(avatar.moves).toEqual(['burn', 'splash', 'dig', 'freeze', 'fetch']);
  });
});

describe('validateContent catches problems', () => {
  it('a schema problem (bad power tier)', () => {
    const r = broken((d) => (d.moves[0].power = 'mega'));
    expect(r.errors.join('\n')).toMatch(/moves\.json 0\.power/);
  });

  it('a duplicate id', () => {
    const r = broken((d) => d.moves.push({ ...d.moves[0] }));
    expect(r.errors).toContain('moves.json: duplicate id "hit"');
  });

  it('a move that does not exist', () => {
    const r = broken((d) => (d.monsters[0].moves[0] = 'laser-beam'));
    expect(r.errors.join('\n')).toMatch(/move "laser-beam" is not in moves\.json/);
  });

  it('more than 4 moves on a normal monster', () => {
    const r = broken((d) => (d.monsters[0].moves = ['hit', 'bite', 'lick', 'sleep', 'eat']));
    expect(r.errors.join('\n')).toMatch(/at most 4 moves/);
  });

  it('an ability that does not exist', () => {
    const r = broken((d) => (d.monsters[0].ability = 'laser-eyes'));
    expect(r.errors.join('\n')).toMatch(/ability "laser-eyes"/);
  });

  it('a one-way evolution link', () => {
    const r = broken((d) => {
      const evolved = d.monsters.find((m) => m.evolvesFrom !== null);
      evolved.evolvesFrom = null;
      evolved.spawnWeight = 10;
    });
    expect(r.errors.join('\n')).toMatch(/should say it evolves from/);
  });

  it('an evolved form with a spawn weight', () => {
    const r = broken((d) => (d.monsters.find((m) => m.evolvesFrom !== null).spawnWeight = 10));
    expect(r.errors.join('\n')).toMatch(/evolved forms don't spawn/);
  });

  it('a biome with no wild monsters', () => {
    const r = broken((d) => d.biomes.push({ id: 'swamp', name: 'Swamp', element: 'water', look: 'Mud.' }));
    expect(r.errors).toContain('biomes.json "swamp": no wild monster spawns here');
  });

  it('a catchable boss', () => {
    const r = broken((d) => (d.monsters.find((m) => m.kind === 'boss').catchable = true));
    expect(r.errors.join('\n')).toMatch(/the boss can't be caught/);
  });

  it('an unused move is only a warning', () => {
    const r = broken((d) => d.moves.push({ id: 'wiggle', name: 'Wiggle', element: null, power: 'low', description: 'Wiggles.', effects: [] }));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toContain('moves.json "wiggle": no monster knows this move');
  });
});
