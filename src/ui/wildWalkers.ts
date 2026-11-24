// Visible wild monsters on a biome map (designer, Round 62): they wander on encounter ground with
// their M8 sprites, and MapScene asks `at(tile)` before each step to start a battle with the one
// it walks into. The rules (where they appear, how they step, how big they look) are in
// src/logic/wildWalkers.ts; this file only draws and times them.
import type * as Phaser from 'phaser';
import { content } from '../data';
import type { Rng } from '../logic/rng';
import { species } from '../logic/monster';
import { mapSpriteSize, sameTile, spawnWalker, walkersFor, wanderStep, WALKERS, type Tile, type Walker } from '../logic/wildWalkers';
import { drawMonster } from './monsterArt';

interface Shown extends Walker {
  sprite: Phaser.GameObjects.Container;
  /** The sprite's own size, so it stands on its tile's bottom edge. */
  px: number;
}

export interface WildWalkersOptions {
  biome: string;
  tileSize: number;
  /** Every encounter tile on the map: where they appear and walk. */
  ground: Tile[];
  /** Tiles the player stands on or is walking into (they never step there). */
  playerTiles: () => Tile[];
  teamLevels: () => number[];
  rng: Rng;
}

export class WildWalkers {
  private readonly scene: Phaser.Scene;
  private readonly opts: WildWalkersOptions;
  private readonly shown: Shown[] = [];
  private nextId = 1;

  constructor(scene: Phaser.Scene, opts: WildWalkersOptions) {
    this.scene = scene;
    this.opts = opts;
    const target = walkersFor(opts.ground.length);
    for (let i = 0; i < target; i++) this.spawn();
    // Scene timers pause with the scene, so nobody moves during a battle or the menu.
    scene.time.addEvent({ delay: WALKERS.respawnMs, loop: true, callback: () => this.shown.length < target && this.spawn() });
  }

  /** The wild monster on this tile, if any. */
  at(tile: Tile): Walker | undefined {
    return this.shown.find((w) => sameTile(w.tile, tile));
  }

  /** Takes a monster off the map (the player walked into it); a new one comes later. */
  remove(id: number): void {
    const i = this.shown.findIndex((w) => w.id === id);
    if (i < 0) return;
    this.shown[i]!.sprite.destroy();
    this.shown.splice(i, 1);
  }

  /** For the test hook. */
  list(): { species: string; big: boolean; tile: Tile }[] {
    return this.shown.map((w) => ({ species: w.spawn.species, big: w.spawn.big, tile: { ...w.tile } }));
  }

  private place(w: Shown, tile: Tile): { x: number; y: number } {
    const T = this.opts.tileSize;
    return { x: tile.x * T + T / 2, y: tile.y * T + T - w.px / 2 + 2 };
  }

  private spawn(): void {
    const player = this.opts.playerTiles()[0] ?? { x: -99, y: -99 };
    const taken = [...this.shown.map((w) => w.tile), ...this.opts.playerTiles()];
    const w = spawnWalker(content, this.opts.biome, this.opts.teamLevels(), this.opts.ground, taken, player, this.nextId++, this.opts.rng);
    if (!w) return;
    const px = mapSpriteSize(species(content, w.spawn.species).scale, w.spawn.big);
    // No star on the map: Big Monsters just look bigger (Round 62).
    const sprite = drawMonster(this.scene, { species: w.spawn.species }, 0, 0, px).setDepth(4.5);
    // A soft shadow under its feet, so it stands out on dark grass or bright snow.
    sprite.addAt(this.scene.add.ellipse(0, px * 0.42, px * 0.8, px * 0.22, 0x000000, 0.28), 0);
    const shown: Shown = { ...w, sprite, px };
    const at = this.place(shown, w.tile);
    sprite.setPosition(at.x, at.y).setAlpha(0);
    this.scene.tweens.add({ targets: sprite, alpha: 1, duration: 400 });
    this.shown.push(shown);
    this.scheduleStep(shown);
  }

  private scheduleStep(w: Shown): void {
    const { min, max } = WALKERS.stepMs;
    this.scene.time.delayedCall(this.opts.rng.int(min, max), () => {
      if (!this.shown.includes(w)) return;
      this.step(w);
      this.scheduleStep(w);
    });
  }

  private step(w: Shown): void {
    const ground = this.opts.ground;
    const canEnter = (t: Tile) =>
      ground.some((g) => sameTile(g, t)) && !this.shown.some((o) => sameTile(o.tile, t)) && !this.opts.playerTiles().some((p) => sameTile(p, t));
    const next = wanderStep(w.tile, canEnter, this.opts.rng);
    if (sameTile(next, w.tile)) return;
    // Sprites face left; turn around when walking right.
    if (next.x !== w.tile.x) w.sprite.setScale(next.x > w.tile.x ? -1 : 1, 1);
    w.tile = next;
    const to = this.place(w, next);
    this.scene.tweens.add({ targets: w.sprite, x: to.x, y: to.y, duration: 450, ease: 'Sine.easeInOut' });
    // A little hop while walking.
    const child = w.sprite.list[1] as Phaser.GameObjects.Components.Transform | undefined;
    if (child) this.scene.tweens.add({ targets: child, y: -3, duration: 110, yoyo: true, repeat: 1 });
  }
}
