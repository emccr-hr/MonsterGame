import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVE_KEY } from '../../../src/config';
import { currentGame, hasSave, loadGame, saveGame, setGame, startGame, testSeed } from '../../../src/state/game';

describe('game store and save', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    const localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    vi.stubGlobal('window', { localStorage, location: { search: '?test&seed=42' } });
    setGame(null);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads the test-only ?seed= and uses it for a new game', () => {
    expect(testSeed()).toBe(42);
    expect(startGame('beach').rngState).toBe(42);
  });

  it('saves to localStorage and loads it back', () => {
    expect(hasSave()).toBe(false);
    startGame('forest');
    setGame({ ...currentGame()!, area: 'forest', tile: { x: 3, y: 4 } });
    saveGame();
    expect(hasSave()).toBe(true);
    setGame(null);
    expect(loadGame()).toBeNull();
    expect(currentGame()).toMatchObject({ openBiomes: ['forest'], area: 'forest', tile: { x: 3, y: 4 } });
  });

  it('explains a missing or damaged save', () => {
    expect(loadGame()).toBe('There is no saved game.');
    store[SAVE_KEY] = '{oops';
    expect(loadGame()).toBe("This save file can't be read.");
  });
});
