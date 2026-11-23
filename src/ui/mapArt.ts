// Map art (M8): buildings, gates and trees drawn from the sprites in src/assets/sprites/tiles/,
// on top of the flat tile colors MapScene paints. Kept out of MapScene so the scene only asks
// "what did you draw?" and skips its old placeholder shapes for those.
import * as Phaser from 'phaser';
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
  /** Avatar's arena (sealed or open), with its own padlock or glowing door. */
  arena: boolean;
}

/** Draws the map's sprites; anything whose file is missing is left to MapScene's old shapes. */
export function drawMapArt(
  scene: Phaser.Scene,
  map: GameMap,
  T: number,
  gateOpen: (biome: string) => boolean,
  arenaOpen = false,
): MapArtDrawn {
  const at = (x: number, y: number) => ({ cx: x * T + T / 2, cy: y * T + T / 2 });
  const drawn: MapArtDrawn = { buildings: false, gates: false, trees: false, arena: false };
  drawWater(scene, map, T);

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
  // Avatar's arena (owner, 2026-11-23): one picture over all its tiles, sealed or open.
  const arenaTiles = [...findAll(map, 'a'), ...findAll(map, 'A')];
  if (arenaTiles.length) {
    const xs = arenaTiles.map((t) => t.x);
    const ys = arenaTiles.map((t) => t.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs) + 1, Math.min(...ys), Math.max(...ys) + 1];
    const img = addSprite(scene, 'tile', arenaOpen ? 'arena-open' : 'arena-sealed', ((x0 + x1) / 2) * T, ((y0 + y1) / 2) * T, Math.max(x1 - x0, y1 - y0) * T);
    if (img) {
      img.setDisplaySize((x1 - x0) * T, (y1 - y0) * T).setDepth(2);
      drawn.arena = true;
    }
  }
  return drawn;
}

/**
 * Water that looks like water (owner, 2026-11-23): little waves, foam along the shore and a slow
 * shimmer. The Volcano's "water" is lava (glowing bubbles) and the Desert's is quicksand (swirls).
 */
function drawWater(scene: Phaser.Scene, map: GameMap, T: number): void {
  const tiles = findAll(map, '~');
  if (!tiles.length) return;
  const isWater = (x: number, y: number) => map.rows[y]?.[x] === '~';
  const kind = map.biome === 'volcano' ? 'lava' : map.biome === 'desert' ? 'sand' : 'water';
  const base = Phaser.Display.Color.IntegerToColor(map.palette.water);
  const light = base.clone().lighten(kind === 'lava' ? 25 : 18).color;
  const edge = kind === 'lava' ? 0xffd166 : kind === 'sand' ? 0xf3dca0 : 0xffffff;

  // Shore: a soft line on every side that touches land.
  const shore = scene.add.graphics().setDepth(0.5);
  shore.lineStyle(3, edge, kind === 'water' ? 0.75 : 0.6);
  for (const t of tiles) {
    const [x, y] = [t.x * T, t.y * T];
    if (!isWater(t.x, t.y - 1)) shore.lineBetween(x, y + 1.5, x + T, y + 1.5);
    if (!isWater(t.x, t.y + 1)) shore.lineBetween(x, y + T - 1.5, x + T, y + T - 1.5);
    if (!isWater(t.x - 1, t.y)) shore.lineBetween(x + 1.5, y, x + 1.5, y + T);
    if (!isWater(t.x + 1, t.y)) shore.lineBetween(x + T - 1.5, y, x + T - 1.5, y + T);
  }

  // Waves (water), bubbles (lava) or swirls (quicksand), drifting gently.
  const fx = scene.add.graphics().setDepth(0.6);
  fx.lineStyle(2.5, light, 0.95);
  tiles.forEach((t, i) => {
    const [x, y] = [t.x * T, t.y * T];
    const off = (i % 2) * 8;
    if (kind === 'water') {
      for (const [wx, wy] of [[4 + off, 10], [14 - off / 2, 22]]) {
        const pts = Array.from({ length: 7 }, (_, k) => new Phaser.Math.Vector2(x + wx! + k * 2, y + wy! + Math.sin(k) * 1.8));
        fx.strokePoints(pts);
      }
    } else if (kind === 'lava') {
      // Dark cooling crust, then bright bubbles on top.
      shore.fillStyle(0xa8240a, 0.85);
      shore.fillEllipse(x + 10 + off, y + 18, 12, 7).fillEllipse(x + 24 - off / 2, y + 8, 9, 5);
      fx.fillStyle(0xffe066, 1);
      fx.fillCircle(x + 8 + off, y + 9, 3.4).fillCircle(x + 23 - off / 2, y + 21, 4.2).fillCircle(x + 15, y + 27, 2.4);
      fx.lineStyle(1.5, 0xfff3b0, 1);
      fx.strokeCircle(x + 23 - off / 2, y + 21, 4.2);
    } else {
      fx.beginPath();
      fx.arc(x + T / 2, y + T / 2, 6 + (i % 3), 0, Math.PI * 1.5);
      fx.strokePath();
    }
  });
  scene.tweens.add({ targets: fx, x: 2, duration: kind === 'sand' ? 3200 : 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: fx, alpha: kind === 'lava' ? 0.7 : 0.6, duration: kind === 'lava' ? 900 : 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // A few sparkles that twinkle on water and lava.
  if (kind !== 'sand') {
    const spark = scene.add.graphics().setDepth(0.7);
    spark.fillStyle(0xffffff, 0.9);
    tiles.filter((_, i) => i % 3 === 0).forEach((t, i) => spark.fillCircle(t.x * T + 6 + (i % 4) * 5, t.y * T + 6 + (i % 3) * 7, 1.3));
    scene.tweens.add({ targets: spark, alpha: 0.1, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
