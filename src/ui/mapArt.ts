// Map art (M8): buildings, gates and trees drawn from the sprites in src/assets/sprites/tiles/,
// on top of the flat tile colors MapScene paints. Kept out of MapScene so the scene only asks
// "what did you draw?" and skips its old placeholder shapes for those.
import type * as Phaser from 'phaser';
import type { GameMap } from '../data/maps';
import { findAll } from '../world/grid';
import { addSprite } from './sprites';

export interface MapArtDrawn {
  /** Shop and Reviver buildings (labels go under them instead of on them). */
  buildings: boolean;
  /** Gate arches with the element icon, or barred with a padlock when locked. */
  gates: boolean;
  /** Trees, cacti, pines or rocks on blocker tiles. */
  trees: boolean;
}

/** Draws the map's sprites; anything whose file is missing is left to MapScene's old shapes. */
export function drawMapArt(scene: Phaser.Scene, map: GameMap, T: number, gateOpen: (biome: string) => boolean): MapArtDrawn {
  const at = (x: number, y: number) => ({ cx: x * T + T / 2, cy: y * T + T / 2 });
  const drawn: MapArtDrawn = { buildings: false, gates: false, trees: false };

  // Decor (Round 65): big pictures over several tiles, like the Beach's big palm trees and coconuts.
  // Blocker tiles under a decor picture don't get their own small tree.
  const decor = map.decor ?? [];
  const underDecor = (x: number, y: number) => decor.some((d) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h);
  for (const d of decor) {
    const small = d.sprite === 'coconut';
    // Big pictures stand on their tiles and grow 1.5x upward, so a big palm towers over the small ones.
    const size = Math.max(d.w, d.h) * T * (small ? 0.7 : 1.5);
    const y = small ? (d.y + d.h / 2) * T : (d.y + d.h) * T - size / 2;
    addSprite(scene, 'tile', d.sprite, (d.x + d.w / 2) * T, y, size)?.setDepth(small ? 1 : 4.6);
  }

  const tree = `tree-${map.biome ?? 'ansonville'}`;
  for (const t of findAll(map, 'T')) {
    if (underDecor(t.x, t.y)) continue;
    const { cx, cy } = at(t.x, t.y);
    drawn.trees = !!addSprite(scene, 'tile', tree, cx, cy, T)?.setDepth(1) || drawn.trees;
  }
  for (const [ch, id] of [
    ['$', 'shop'],
    ['R', 'reviver'],
  ] as const) {
    for (const t of findAll(map, ch)) {
      const { cx, cy } = at(t.x, t.y);
      // 36x44 art: the roof pokes above the tile, the door sits on its bottom edge.
      drawn.buildings = !!addSprite(scene, 'tile', id, cx, cy - 6, T * 1.375)?.setDepth(3) || drawn.buildings;
    }
  }
  for (const [ch, biome] of Object.entries(map.gates ?? {})) {
    for (const t of findAll(map, ch)) {
      const { cx, cy } = at(t.x, t.y);
      drawn.gates = !!addSprite(scene, 'tile', `gate-${biome}-${gateOpen(biome) ? 'open' : 'locked'}`, cx, cy, T * 1.15)?.setDepth(3) || drawn.gates;
    }
  }
  return drawn;
}
