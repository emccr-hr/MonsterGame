// Wires the map's WILD_ENCOUNTER event to the battle (M4): pause the map, run the Battle scene on
// top, and the Battle scene resumes the map (or wakes the player at a Reviver) when it ends.
import type * as Phaser from 'phaser';
import { WILD_ENCOUNTER, type WildEncounterEvent } from './events';

export function installEncounterFlow(game: Phaser.Game): void {
  game.events.on(WILD_ENCOUNTER, (e: WildEncounterEvent) => {
    if (game.scene.isActive('Battle')) return;
    game.scene.pause(e.sceneKey);
    game.scene.run('Battle', e);
  });
}
