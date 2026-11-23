// Monster art shared by every scene that shows a monster: battle, team, backpack, Monster Book,
// evolution. A monster with a vector sprite (src/assets/sprites/monsters/<id>.svg, M8) is drawn
// from it; any other monster falls back to a placeholder made from its `art` look in monsters.json
// (colors and markings), so a new monster needs no code change either way (ADR 0003). Fallback
// shapes are sized as fractions of the sprite so they read at 40 px.
import * as Phaser from 'phaser';
import { FONT } from '../config';
import { content } from '../data';
import type { MonsterArt } from '../data/schema';
import { battleSpriteSize } from '../logic/battleUi';
import { species } from '../logic/monster';
import { fitBox, monsterKey } from './spriteManifest';
import { monsterSprites, monsterTier } from './sprites';

export interface MonsterLookInput {
  species: string;
  big?: boolean;
}

export interface DrawMonsterOptions {
  /** Mirror the sprite. Sprites face left (or the front), so the player's side in battle flips them. */
  flip?: boolean;
}


const hex = (c: string): number => parseInt(c.slice(1), 16);
const darker = (c: number, amount: number): number => Phaser.Display.Color.IntegerToColor(c).darken(amount).color;

/** The body is an ellipse px wide and 0.85 px tall, centered on (0, 0). */
const RX = 0.5;
const RY = 0.425;

/** Outline of the body ellipse between x0 and x1 (fractions of px), for "segments" bands. */
function bandPoints(px: number, x0: number, x1: number, inset: number): Phaser.Math.Vector2[] {
  const steps = 8;
  const top: Phaser.Math.Vector2[] = [];
  const bottom: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const h = RY * inset * Math.sqrt(Math.max(0, 1 - (x / (RX * inset)) ** 2));
    top.push(new Phaser.Math.Vector2(x * px, -h * px));
    bottom.unshift(new Phaser.Math.Vector2(x * px, h * px));
  }
  return [...top, ...bottom];
}

function drawMarkings(g: Phaser.GameObjects.Graphics, art: MonsterArt, px: number): void {
  const accent = hex(art.accent);
  const oval = (x: number, y: number, w: number, h: number) => g.fillEllipse(x * px, y * px, w * px, h * px);
  const dot = (x: number, y: number, r: number) => g.fillCircle(x * px, y * px, Math.max(1.5, r * px));
  g.fillStyle(accent);
  switch (art.markings) {
    case 'none':
      break;
    case 'spots':
      dot(-0.28, 0.14, 0.07);
      dot(0.24, 0.2, 0.065);
      dot(0.02, 0.3, 0.05);
      dot(-0.36, -0.08, 0.045);
      dot(0.37, -0.04, 0.05);
      break;
    case 'stripes': {
      const w = Math.max(2, 0.07 * px);
      for (const x of [-0.2, 0, 0.2]) g.fillRect(x * px - w / 2, -0.37 * px, w, 0.14 * px);
      for (const x of [-0.38, 0.38]) g.fillRect(x * px - w / 2, 0.02 * px, w, 0.16 * px);
      break;
    }
    case 'belly':
      oval(0, 0.2, 0.56, 0.38);
      break;
    case 'mask':
      oval(0, -0.1, 0.72, 0.28);
      break;
    case 'patch':
      // One big spot on the body and one over the upper-left of the face (Peggy, owner 2026-11-21).
      oval(0.2, 0.18, 0.36, 0.3);
      oval(-0.2, -0.17, 0.42, 0.34);
      break;
    case 'tux':
      oval(0, 0.07, 0.66, 0.66);
      break;
    case 'crown': {
      const corners: [number, number][] = [
        [-0.2, -0.38],
        [-0.2, -0.58],
        [-0.1, -0.47],
        [0, -0.62],
        [0.1, -0.47],
        [0.2, -0.58],
        [0.2, -0.38],
      ];
      const pts = corners.map(([x, y]) => new Phaser.Math.Vector2(x * px, y * px));
      g.fillPoints(pts, true);
      g.lineStyle(Math.max(1, px / 60), darker(accent, 40));
      g.strokePoints(pts, true);
      break;
    }
    case 'segments': {
      // Bands of the body color plus each extra color, left to right.
      const colors = [hex(art.body), ...(art.extra ?? []).map(hex)];
      const left = -RX * 0.97;
      const w = (2 * RX * 0.97) / colors.length;
      colors.forEach((c, i) => {
        g.fillStyle(c);
        g.fillPoints(bandPoints(px, left + i * w, left + (i + 1) * w, 0.97), true);
      });
      // A small gem in the middle so the accent color shows too.
      g.fillStyle(accent);
      dot(0, 0.24, 0.07);
      break;
    }
  }
}

/**
 * Draws a monster as a container centered on (x, y). `size` overrides the battle size rule
 * (`battleSpriteSize`), e.g. for small icons in menus: a sprite's longest side is that many px,
 * like the placeholder's width. Big Monsters get 1.25x and a star.
 */
export function drawMonster(
  scene: Phaser.Scene,
  m: MonsterLookInput,
  x: number,
  y: number,
  size?: number,
  opts: DrawMonsterOptions = {},
): Phaser.GameObjects.Container {
  const s = species(content, m.species);
  const px = (size ?? battleSpriteSize(s.scale)) * (m.big ? 1.25 : 1);
  const sprite = monsterSprites[s.id];
  // The texture size that matches the drawn size on the (bigger, sharper) canvas.
  const key = monsterKey(s.id, monsterTier(s.id, px));
  const parts: Phaser.GameObjects.GameObject[] = [];
  let top: number;
  // The vector sprite if its file exists and loaded; otherwise the look-data placeholder.
  if (sprite && scene.textures.exists(key)) {
    const box = fitBox(sprite.width, sprite.height, px);
    parts.push(scene.add.image(0, 0, key).setDisplaySize(box.width, box.height).setFlipX(!!opts.flip));
    top = -box.height / 2;
  } else {
    parts.push(...drawPlaceholder(scene, s.name, s.art, px));
    top = s.art.markings === 'crown' ? -px * 0.62 : -px * 0.425;
  }
  if (m.big) {
    const r = Math.max(6, Math.min(18, px * 0.18));
    parts.push(scene.add.star(0, top - r * 0.6, 5, r * 0.45, r, 0xffd166).setStrokeStyle(2, 0x7a5c00));
  }
  return scene.add.container(x, y, parts);
}

/** The look-data placeholder (before M8): a colored body with markings, eyes and the name's first letter. */
function drawPlaceholder(scene: Phaser.Scene, name: string, art: MonsterArt, px: number): Phaser.GameObjects.GameObject[] {
  const body = hex(art.body);
  const g = scene.add.graphics();
  g.fillStyle(body);
  g.fillEllipse(0, 0, px, px * 0.85);
  drawMarkings(g, art, px);
  // Outline on top: a darker shade of the body (near-black bodies get a gray rim instead).
  const outline = Phaser.Display.Color.IntegerToColor(body).v < 0.3 ? 0x5a5f6a : darker(body, 30);
  g.lineStyle(Math.max(2, px / 30), outline);
  g.strokeEllipse(0, 0, px, px * 0.85);

  // Eyes, with a thin rim so they still show on white bodies.
  g.fillStyle(0xffffff);
  g.lineStyle(Math.max(1, px / 60), 0x1b1b1b);
  for (const ex of [-0.18, 0.18]) {
    g.fillCircle(ex * px, -0.1 * px, 0.1 * px);
    g.strokeCircle(ex * px, -0.1 * px, 0.1 * px);
  }
  g.fillStyle(0x1b1b1b);
  g.fillCircle(-0.16 * px, -0.08 * px, 0.05 * px);
  g.fillCircle(0.2 * px, -0.08 * px, 0.05 * px);

  return [
    g,
    // The name's first letter: a cue that doesn't rely on color.
    scene.add
      .text(0, px * 0.18, name.charAt(0), {
        fontFamily: FONT,
        fontSize: `${Math.round(px * 0.28)}px`,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5),
  ];
}
