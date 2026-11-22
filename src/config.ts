// Game-wide constants shared by scenes. (Game rules and numbers live in src/logic and src/data.)

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** localStorage key for the save file. The save format itself arrives in M2 (src/logic/save.ts). */
export const SAVE_KEY = 'magic-and-monsters.save';

export const COLORS = {
  background: '#14112b',
  title: '#ffd166',
  text: '#ffffff',
  selected: '#7bdff2',
  disabled: '#6c6a80',
} as const;

export const FONT = 'Trebuchet MS, Arial, sans-serif';

/** World maps (M3): pixels per grid tile, and how long one step takes. */
export const TILE_SIZE = 32;
/** 187 ms is 75% of the first walking speed (140 ms), owner's pick 2026-11-22. */
export const STEP_MS = 187;
