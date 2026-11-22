import { describe, expect, it } from 'vitest';
import { newGame } from '../../../src/logic/game';
import { buyRow, maxAffordable, shopRows } from '../../../src/logic/shop';
import { realContent } from '../helpers';

const content = realContent();

describe('shop', () => {
  it('sells every item, then a map part for each locked biome', () => {
    const rows = shopRows(content, newGame(content, 'forest', 1));
    expect(rows.filter((r) => r.kind === 'item').map((r) => r.id)).toEqual(['cage', 'potion', 'wake-up-snack', 'teleport-pin']);
    const parts = rows.filter((r) => r.kind === 'mapPart');
    expect(parts.map((r) => r.id)).toEqual(['beach', 'desert', 'snowy', 'volcano']);
    expect(parts[0]).toMatchObject({ name: 'Map Part: Beach', price: 50 });
    expect(rows[0]).toMatchObject({ name: 'Cage', price: 10, owned: 100 });
  });

  it('buying a map part opens that biome and takes it off the list', () => {
    const s = newGame(content, 'forest', 1);
    const desert = shopRows(content, s).find((r) => r.id === 'desert')!;
    const r = buyRow(content, s, desert, 1);
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.openBiomes).toEqual(['forest', 'desert']);
    expect(r.state.gems).toBe(50);
    expect(shopRows(content, r.state).some((x) => x.id === 'desert')).toBe(false);
  });

  it('buys several items at once and says no without enough gems', () => {
    const s = newGame(content, 'forest', 1);
    const potion = shopRows(content, s).find((r) => r.id === 'potion')!;
    const r = buyRow(content, s, potion, 3);
    expect(r.ok && [r.state.bag.potion, r.state.gems]).toEqual([3, 55]);
    const broke = buyRow(content, { ...s, gems: 5 }, potion, 1);
    expect(broke.ok).toBe(false);
    if (!broke.ok) expect(broke.reason).toMatch(/need 15 Magic Gems/);
  });

  it('knows the most you can afford', () => {
    const rows = shopRows(content, newGame(content, 'forest', 1));
    expect(maxAffordable(rows.find((r) => r.id === 'cage')!, 100)).toBe(10);
    expect(maxAffordable(rows.find((r) => r.id === 'cage')!, 5000)).toBe(99);
    expect(maxAffordable(rows.find((r) => r.kind === 'mapPart')!, 100)).toBe(1);
    expect(maxAffordable(rows.find((r) => r.kind === 'mapPart')!, 49)).toBe(0);
  });
});
