// What the shop sells and buying it (M6; Progression-and-Economy.md, UI-and-HUD.md "Shop").
// Prices live in items.json; buy and buyMapPart (world.ts) do the actual buying.
import type { Content } from '../data/schema.ts';
import type { GameState, Result } from './game.ts';
import { buy, buyMapPart, lockedBiomes } from './world.ts';

export interface ShopRow {
  /** Item id, or the biome id for a map part. */
  id: string;
  kind: 'item' | 'mapPart';
  /** "Cage", or "Map Part: Desert". */
  name: string;
  price: number;
  /** How many you have (map parts: 0, they are used right away). */
  owned: number;
  description: string;
}

/** Every item for sale, then one map part per biome that is still locked. */
export function shopRows(content: Content, state: GameState): ShopRow[] {
  const rows: ShopRow[] = [];
  for (const it of content.items) {
    if (it.effect.kind === 'mapPart') continue;
    rows.push({ id: it.id, kind: 'item', name: it.name, price: it.price, owned: state.bag[it.id] ?? 0, description: it.description });
  }
  const part = content.items.find((i) => i.effect.kind === 'mapPart');
  if (part) {
    for (const biomeId of lockedBiomes(content, state)) {
      const biome = content.biomes.find((b) => b.id === biomeId)!;
      rows.push({
        id: biomeId,
        kind: 'mapPart',
        name: `${part.name}: ${biome.name}`,
        price: part.price,
        owned: 0,
        description: `Opens the gate to the ${biome.name}.`,
      });
    }
  }
  return rows;
}

/** The most of this row you can buy with your gems (map parts: 1 or 0). */
export function maxAffordable(row: ShopRow, gems: number): number {
  const n = Math.floor(gems / Math.max(1, row.price));
  return row.kind === 'mapPart' ? Math.min(1, n) : Math.min(99, n);
}

/** Buys `qty` of a row: an item into the bag, or a map part that opens its biome now. */
export function buyRow(content: Content, state: GameState, row: ShopRow, qty: number): Result<GameState> {
  return row.kind === 'mapPart' ? buyMapPart(content, state, row.id) : buy(content, state, row.id, qty);
}
