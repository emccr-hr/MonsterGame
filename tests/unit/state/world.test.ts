import { beforeEach, describe, expect, it } from 'vitest';
import {
  getWorld,
  isBiomeOpen,
  markTipSeen,
  openAllBiomes,
  openBiome,
  resetWorld,
  setPlayerPosition,
  startNewGame,
} from '../../../src/state/world';

describe('world state', () => {
  beforeEach(() => resetWorld());

  it('starts with no game and nothing open', () => {
    expect(getWorld()).toEqual({ startBiome: null, openBiomes: [], area: null, tile: null, seenTips: [] });
  });

  it('New Game opens only the picked biome and starts in Ansonville', () => {
    startNewGame('beach');
    expect(getWorld()).toMatchObject({ startBiome: 'beach', openBiomes: ['beach'], area: 'ansonville' });
    expect(isBiomeOpen('beach')).toBe(true);
    expect(isBiomeOpen('forest')).toBe(false);
  });

  it('rejects unknown biomes', () => {
    expect(() => startNewGame('moon')).toThrow();
    expect(() => openBiome('moon')).toThrow();
  });

  it('opens more biomes once each', () => {
    startNewGame('forest');
    openBiome('snowy');
    openBiome('snowy');
    expect(getWorld().openBiomes).toEqual(['forest', 'snowy']);
    openAllBiomes();
    expect(getWorld().openBiomes).toHaveLength(5);
  });

  it('a new game clears the last one', () => {
    startNewGame('forest');
    openBiome('desert');
    markTipSeen('biome');
    startNewGame('volcano');
    expect(getWorld()).toMatchObject({ openBiomes: ['volcano'], seenTips: [] });
  });

  it('tracks the player position and returns copies', () => {
    const tile = { x: 3, y: 4 };
    setPlayerPosition('desert', tile);
    tile.x = 99;
    const w = getWorld();
    expect(w).toMatchObject({ area: 'desert', tile: { x: 3, y: 4 } });
    w.openBiomes.push('forest');
    expect(isBiomeOpen('forest')).toBe(false);
  });

  it('shows each tip once', () => {
    expect(markTipSeen('ansonville')).toBe(true);
    expect(markTipSeen('ansonville')).toBe(false);
  });
});
