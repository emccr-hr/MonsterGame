import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVE_KEY } from '../../../src/config';
import { content } from '../../../src/data';
import { newGame } from '../../../src/logic/game';
import { serialize } from '../../../src/logic/save';
import { currentGame, setGame } from '../../../src/state/game';
import { importSave, saveFileName } from '../../../src/state/saveFile';

describe('save file backup', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    const localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v) };
    vi.stubGlobal('window', { localStorage, location: { search: '' } });
    setGame(null);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('names the file with the date', () => {
    expect(saveFileName(new Date(2026, 10, 22))).toBe('magic-and-monsters-save-2026-11-22.json');
  });

  it('loads a save file into play and into the browser save', () => {
    const game = newGame(content, 'desert', 3);
    expect(importSave(serialize(game))).toBeNull();
    expect(currentGame()?.openBiomes).toEqual(['desert']);
    expect(store[SAVE_KEY]).toBe(serialize(game));
  });

  it('says why a bad file does not load, and keeps the game as it was', () => {
    expect(importSave('not json')).toMatch(/can't be read/);
    expect(importSave(JSON.stringify({ version: 1, state: { gems: -5 } }))).toMatch(/damaged/);
    expect(currentGame()).toBeNull();
    expect(store[SAVE_KEY]).toBeUndefined();
  });
});
