// Seeded random numbers (ADR 0002). Every game rule that needs chance takes an `Rng`, so tests can
// pass a fixed seed and get the same result every time. Plain TypeScript: no Phaser, no DOM.

export interface Rng {
  /** A number from 0 (inclusive) to 1 (exclusive). */
  next(): number;
  /** A whole number from `min` to `max`, both inclusive. */
  int(min: number, max: number): number;
  /** True with probability `p` (0 = never, 1 = always). */
  chance(p: number): boolean;
  /** One item from a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** One item from a list, chosen by weight (for spawn tables). Weights must be >= 0, total > 0. */
  weighted<T>(items: readonly { item: T; weight: number }[]): T;
  /** The internal state, so a save file can resume the same sequence. */
  getState(): number;
  setState(state: number): void;
}

/** Turns any text (a seed phrase, a date) into a 32-bit seed. */
export function seedFromString(text: string): number {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small, fast seeded generator (mulberry32). Same seed, same numbers, on every machine. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError(`rng.int needs whole numbers with min <= max (got ${min}, ${max})`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p) {
      if (p <= 0) return false;
      if (p >= 1) return true;
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) throw new RangeError('rng.pick needs at least one item');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    weighted(items) {
      let total = 0;
      for (const { weight } of items) {
        if (!(weight >= 0)) throw new RangeError(`rng.weighted got a bad weight: ${weight}`);
        total += weight;
      }
      if (total <= 0) throw new RangeError('rng.weighted needs a total weight above 0');
      let roll = next() * total;
      for (const entry of items) {
        if (roll < entry.weight) return entry.item;
        roll -= entry.weight;
      }
      // Floating-point leftovers: fall back to the last item with weight.
      return [...items].reverse().find((e) => e.weight > 0)!.item;
    },
    getState: () => state,
    setState(s) {
      state = s >>> 0;
    },
  };
}
