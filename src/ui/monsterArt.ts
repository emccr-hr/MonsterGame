// Placeholder monster art (vector style, Art-Direction.md), shared by every scene that shows a
// monster: battle, team, backpack, Monster Book, evolution. Swap this for real sprites later.
import * as Phaser from 'phaser';
import { FONT } from '../config';
import { content } from '../data';
import type { Element } from '../data/schema';
import { battleSpriteSize } from '../logic/battleUi';
import { species } from '../logic/monster';

const ELEMENT_COLORS: Record<Element, number> = {
  fire: 0xff6b35,
  water: 0x3fa7f5,
  earth: 0xb07d4f,
  ice: 0x9fe3ff,
  nature: 0x5cc85c,
};

export interface MonsterLookInput {
  species: string;
  big?: boolean;
}

/**
 * Draws a monster as a container centered on (x, y). `size` overrides the battle size rule
 * (`battleSpriteSize`), e.g. for small icons in menus. Big Monsters get 1.25x and a star.
 */
export function drawMonster(scene: Phaser.Scene, m: MonsterLookInput, x: number, y: number, size?: number): Phaser.GameObjects.Container {
  const s = species(content, m.species);
  const biome = content.biomes.find((b) => b.id === s.biome);
  const color = s.kind === 'boss' ? 0x8e5bd6 : ELEMENT_COLORS[biome?.element ?? 'nature'];
  const px = (size ?? battleSpriteSize(s.scale)) * (m.big ? 1.25 : 1);
  const dark = Phaser.Display.Color.IntegerToColor(color).darken(30).color;
  const parts: Phaser.GameObjects.GameObject[] = [
    scene.add.ellipse(0, 0, px, px * 0.85, color).setStrokeStyle(Math.max(2, px / 30), dark),
    scene.add.circle(-px * 0.18, -px * 0.1, px * 0.1, 0xffffff),
    scene.add.circle(px * 0.18, -px * 0.1, px * 0.1, 0xffffff),
    scene.add.circle(-px * 0.16, -px * 0.08, px * 0.05, 0x1b1b1b),
    scene.add.circle(px * 0.2, -px * 0.08, px * 0.05, 0x1b1b1b),
    scene.add
      .text(0, px * 0.18, s.name.charAt(0), {
        fontFamily: FONT,
        fontSize: `${Math.round(px * 0.28)}px`,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5),
  ];
  if (m.big) {
    const r = Math.max(6, Math.min(18, px * 0.18));
    parts.push(scene.add.star(0, -px * 0.55, 5, r * 0.45, r, 0xffd166).setStrokeStyle(2, 0x7a5c00));
  }
  return scene.add.container(x, y, parts);
}
