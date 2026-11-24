// Events that scenes send on `game.events`, so later milestones can listen without editing the scene.
import type { Spawn } from '../logic/spawning';
import type { Tile } from '../world/grid';

/**
 * Fired when the player steps on encounter ground and a wild monster shows up (M3 placeholder).
 * M4 listens for this (or replaces MapScene.startEncounter) to open the real encounter.
 */
export const WILD_ENCOUNTER = 'wild-encounter';

export interface WildEncounterEvent {
  /** The biome whose monsters can appear (biomes.json id). */
  biomeId: string;
  /** The Phaser scene key of the map, e.g. "Forest". Resume this scene after the encounter. */
  sceneKey: string;
  tile: Tile;
  /** The visible wild monster the player walked into (Round 62); missing for a hidden surprise. */
  spawn?: Spawn;
  /** Avatar's battle (M6b): walking into the open arena gate. `biomeId` is then the map's id. */
  boss?: boolean;
}
