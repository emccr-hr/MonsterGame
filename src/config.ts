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
export const STEP_MS = 140;

/**
 * Step-based encounters on encounter ground (M3 placeholder; the designer hasn't picked visible
 * wild monsters yet, Open-Questions F). Chance per step, after a few safe steps. M4 may tune these.
 */
export const ENCOUNTER_CHANCE = 0.1;
export const SAFE_STEPS_AFTER_ENCOUNTER = 3;
