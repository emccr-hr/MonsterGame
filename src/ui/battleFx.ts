// Battle and capture action graphics (owner, 2026-11-23): an element-colored shot flies from the
// attacker, the target gets a burst for the move's element (flames, splashes, snowflakes, rocks,
// leaves, or a star for moves with no element), plus burned, frozen, heal and cage effects.
// Shapes and tweens only (no image files), so every move and monster gets an effect from its data.
import * as Phaser from 'phaser';
import type { Element } from '../data/schema';

export type FxElement = Element | null;

interface Palette {
  main: number;
  light: number;
}
const COLORS: Record<Element | 'none', Palette> = {
  fire: { main: 0xff6a1a, light: 0xffd166 },
  water: { main: 0x3b9be0, light: 0xbfe6ff },
  ice: { main: 0x9fd8ff, light: 0xffffff },
  earth: { main: 0xa0703a, light: 0xd9b88a },
  nature: { main: 0x3fae4a, light: 0xb8f08a },
  none: { main: 0xffd166, light: 0xffffff },
};
const colorsOf = (el: FxElement): Palette => COLORS[el ?? 'none'];
const DEPTH = 40;
/** Every piece gets a dark outline so it shows on bright snow and sand as well as dark ash. */
const INK = 0x2a2030;

/** One small piece that flies from (x, y) by (dx, dy), spinning and fading. */
function piece(scene: Phaser.Scene, shape: Phaser.GameObjects.Shape, dx: number, dy: number, ms: number, opts: { spin?: number; fall?: number } = {}): void {
  shape.setDepth(DEPTH);
  if (!shape.isStroked) shape.setStrokeStyle(2, INK);
  scene.tweens.add({
    targets: shape,
    x: shape.x + dx,
    y: shape.y + dy + (opts.fall ?? 0),
    angle: opts.spin ?? 0,
    alpha: 0,
    scale: 0.4,
    duration: ms,
    ease: opts.fall ? 'Quad.easeIn' : 'Cubic.easeOut',
    onComplete: () => shape.destroy(),
  });
}

/** A ring that grows and fades: the "pow" of a hit. */
function ring(scene: Phaser.Scene, x: number, y: number, color: number, r: number): void {
  const c = scene.add.circle(x, y, r * 0.3).setStrokeStyle(6, color).setDepth(DEPTH);
  c.isFilled = false;
  scene.tweens.add({ targets: c, scale: 3, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
}

/** The burst on a monster that was hit, in its attacker's move element. `size` is the target's sprite size. */
export function hitEffect(scene: Phaser.Scene, x: number, y: number, el: FxElement, size = 100): void {
  const { main, light } = colorsOf(el);
  const r = Math.max(45, size * 0.6);
  ring(scene, x, y, main, r);
  // A big "pow" flash in the middle.
  const pow = scene.add.star(x, y, 8, r * 0.28, r * 0.62, light).setStrokeStyle(4, main).setDepth(DEPTH + 1).setScale(0.3);
  scene.tweens.add({ targets: pow, scale: 1.1, angle: 20, duration: 140, ease: 'Back.easeOut', yoyo: true, hold: 80, onComplete: () => pow.destroy() });
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const dist = r * (0.8 + Math.random() * 0.6);
    const [dx, dy] = [Math.cos(a) * dist, Math.sin(a) * dist];
    switch (el) {
      case 'fire':
        piece(scene, scene.add.triangle(x, y, 0, 18, 9, -14, 18, 18, i % 2 ? main : light), dx * 0.7, dy * 0.5 - r * 0.6, 620);
        break;
      case 'water':
        piece(scene, scene.add.ellipse(x, y, 12, 17, i % 2 ? main : light), dx, dy - r * 0.3, 640, { fall: r * 0.7 });
        break;
      case 'ice':
        piece(scene, scene.add.star(x, y, 6, 4, 12, i % 2 ? main : light).setStrokeStyle(2, 0x2f6fa8), dx, dy, 680, { spin: 180 });
        break;
      case 'earth':
        piece(scene, scene.add.rectangle(x, y, 14, 12, i % 2 ? main : light).setStrokeStyle(2, 0x4a3418), dx, dy - r * 0.4, 680, { spin: 220, fall: r * 0.9 });
        break;
      case 'nature':
        piece(scene, scene.add.ellipse(x, y, 20, 10, i % 2 ? main : light).setStrokeStyle(2, 0x1f5a24), dx, dy, 760, { spin: 300, fall: r * 0.3 });
        break;
      default:
        piece(scene, scene.add.star(x, y, 4, 5, 14, i % 2 ? main : 0xff9f43), dx, dy, 520, { spin: 90 });
    }
  }
  scene.cameras.main.shake(90, 0.004);
}

/** An element-colored shot from the attacker to the target. Moves with no power (status moves) glow on the user instead. */
export function moveShot(scene: Phaser.Scene, from: { x: number; y: number }, to: { x: number; y: number }, el: FxElement, isAttack: boolean): void {
  const { main, light } = colorsOf(el);
  if (!isAttack) {
    // A swirl of sparkles around the monster using a status move (Screech, Sleep, Gem Glare...).
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = scene.add.star(from.x + Math.cos(a) * 50, from.y + Math.sin(a) * 50, 4, 4, 11, i % 2 ? main : light).setStrokeStyle(2, INK).setDepth(DEPTH);
      scene.tweens.add({ targets: s, x: from.x, y: from.y - 10, alpha: 0, angle: 180, duration: 500, onComplete: () => s.destroy() });
    }
    return;
  }
  const orb = scene.add.circle(from.x, from.y, 13, main).setStrokeStyle(3, INK).setDepth(DEPTH);
  const trail = scene.time.addEvent({
    delay: 30,
    repeat: 6,
    callback: () => {
      const t = scene.add.circle(orb.x, orb.y, 9, light, 0.9).setStrokeStyle(2, main).setDepth(DEPTH - 1);
      scene.tweens.add({ targets: t, scale: 0.2, alpha: 0, duration: 220, onComplete: () => t.destroy() });
    },
  });
  scene.tweens.add({
    targets: orb,
    x: to.x,
    y: to.y,
    duration: 200,
    ease: 'Quad.easeIn',
    onComplete: () => {
      trail.remove();
      orb.destroy();
    },
  });
}

/** Burned: little flames dance up the monster. Frozen: ice shards close in and it flashes blue. */
export function statusEffect(scene: Phaser.Scene, x: number, y: number, status: 'burned' | 'frozen', sprite?: Phaser.GameObjects.Container): void {
  if (status === 'burned') {
    for (let i = 0; i < 7; i++) {
      const f = scene.add.triangle(x - 42 + i * 14, y + 25, 0, 20, 10, -16, 20, 20, i % 2 ? 0xff6a1a : 0xffd166).setStrokeStyle(2, 0x7a2200).setDepth(DEPTH);
      scene.tweens.add({ targets: f, y: y - 30, alpha: 0, scaleY: 1.6, duration: 700, delay: i * 60, onComplete: () => f.destroy() });
    }
    return;
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = scene.add.star(x + Math.cos(a) * 80, y + Math.sin(a) * 80, 6, 5, 15, 0xffffff).setStrokeStyle(3, 0x2f6fa8).setDepth(DEPTH);
    scene.tweens.add({ targets: s, x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 30, alpha: 0, angle: 90, duration: 520, onComplete: () => s.destroy() });
  }
  const tint = sprite?.list.find((o): o is Phaser.GameObjects.Image => o instanceof Phaser.GameObjects.Image);
  if (tint) {
    tint.setTint(0x9fd8ff);
    scene.time.delayedCall(700, () => tint.clearTint());
  }
}

/** Healing: green sparkles rise. */
export function healEffect(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    const p = scene.add.star(x - 44 + i * 12, y + 30, 4, 4, 11, i % 2 ? 0x5fdc7a : 0xd8ffd0).setStrokeStyle(2, 0x1f6a2a).setDepth(DEPTH);
    scene.tweens.add({ targets: p, y: y - 40 - (i % 3) * 10, alpha: 0, angle: 90, duration: 800, delay: i * 50, onComplete: () => p.destroy() });
  }
}

/** Gold sparkles that follow the thrown cage. Returns a stop function. */
export function cageTrail(scene: Phaser.Scene, cage: Phaser.GameObjects.Container): () => void {
  const ev = scene.time.addEvent({
    delay: 35,
    loop: true,
    callback: () => {
      const s = scene.add.star(cage.x + (Math.random() - 0.5) * 20, cage.y + (Math.random() - 0.5) * 20, 4, 3, 9, Math.random() < 0.5 ? 0xffd166 : 0xffffff).setStrokeStyle(1.5, 0xb8860b).setDepth(DEPTH - 1);
      scene.tweens.add({ targets: s, alpha: 0, scale: 0.2, angle: 120, duration: 380, onComplete: () => s.destroy() });
    },
  });
  return () => ev.remove();
}

/** Caught! A burst of gold stars and a glow ring around the cage. */
export function caughtBurst(scene: Phaser.Scene, x: number, y: number): void {
  ring(scene, x, y, 0xffd166, 50);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    piece(scene, scene.add.star(x, y, 5, 6, 15, i % 2 ? 0xffd166 : 0xffffff).setStrokeStyle(2, 0xb8860b), Math.cos(a) * 110, Math.sin(a) * 110, 800, { spin: 200 });
  }
}

/** It broke free: a puff of smoke and the cage bars flying off. */
export function breakFreePuff(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    piece(scene, scene.add.circle(x, y, 16, 0xdddddd, 0.9).setStrokeStyle(2, 0x8a8a8a), Math.cos(a) * 60, Math.sin(a) * 50, 600);
    piece(scene, scene.add.rectangle(x, y, 4, 18, 0xc9a227), Math.cos(a) * 80, Math.sin(a) * 60, 600, { spin: 270, fall: 40 });
  }
}

// ---- More battle animations (owner, 2026-11-23): numbers, wind-up, dodge, faint, victory, defeat, run.

/** "-23" in red or "+20" in green, floating up from a monster. */
export function floatingNumber(scene: Phaser.Scene, x: number, y: number, text: string, color: string): void {
  const t = scene.add
    .text(x + (Math.random() - 0.5) * 20, y - 20, text, { fontFamily: 'system-ui, sans-serif', fontSize: '28px', fontStyle: 'bold', color, stroke: '#1b1530', strokeThickness: 5 })
    .setOrigin(0.5)
    .setDepth(DEPTH + 2)
    .setScale(0.6);
  scene.tweens.add({ targets: t, scale: 1.1, duration: 120, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, y: y - 80, alpha: 0, duration: 900, delay: 250, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

/** The attacker pulls back, then lunges forward and returns. `dir` is +1 for the player (left), -1 for the wild one. */
export function windUpLunge(scene: Phaser.Scene, sprite: Phaser.GameObjects.Container, dir: number): void {
  const x0 = sprite.x;
  scene.tweens.chain({
    targets: sprite,
    tweens: [
      { x: x0 - 14 * dir, scaleY: 0.92, duration: 90, ease: 'Quad.easeOut' },
      { x: x0 + 34 * dir, scaleY: 1.05, duration: 90, ease: 'Quad.easeIn' },
      { x: x0, scaleY: 1, duration: 140, ease: 'Quad.easeOut' },
    ],
  });
}

/** The monster that got hit is knocked back a little. */
export function knockBack(scene: Phaser.Scene, sprite: Phaser.GameObjects.Container, dir: number): void {
  const x0 = sprite.x;
  scene.tweens.add({ targets: sprite, x: x0 + 16 * dir, angle: 6 * dir, duration: 70, yoyo: true, ease: 'Quad.easeOut', onComplete: () => sprite.setAngle(0).setX(x0) });
}

/** A miss: the target hops aside (a dodge) or just shimmers (a block), with "MISS!" or "BLOCKED!". */
export function dodge(scene: Phaser.Scene, sprite: Phaser.GameObjects.Container | undefined, x: number, y: number, blocked = false): void {
  if (sprite && !blocked) {
    const y0 = sprite.y;
    scene.tweens.add({ targets: sprite, y: y0 - 26, x: sprite.x + 18, duration: 140, yoyo: true, ease: 'Quad.easeOut', onComplete: () => sprite.setY(y0) });
  }
  const shield = scene.add.circle(x, y, 60, 0x9fd8ff, 0.25).setStrokeStyle(4, 0xffffff, 0.9).setDepth(DEPTH);
  scene.tweens.add({ targets: shield, scale: 1.25, alpha: 0, duration: 450, onComplete: () => shield.destroy() });
  floatingNumber(scene, x, y - 30, blocked ? 'BLOCKED!' : 'MISS!', '#ffffff');
}

/** Fainting: a puff of smoke and a few dizzy stars. */
export function faintPuff(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    piece(scene, scene.add.circle(x, y + 20, 14, 0xd9d9e0, 0.9).setStrokeStyle(2, 0x8a8a96), Math.cos(a) * 50, Math.sin(a) * 25 - 20, 700);
  }
  for (let i = 0; i < 3; i++) {
    const s = scene.add.star(x, y - 50, 5, 4, 9, 0xffd166).setStrokeStyle(2, INK).setDepth(DEPTH + 1);
    scene.tweens.add({ targets: s, x: x + Math.cos(i * 2.1) * 30, y: y - 60 + Math.sin(i * 2.1) * 10, angle: 360, alpha: 0, duration: 900, delay: i * 80, onComplete: () => s.destroy() });
  }
}

/** A big banner across the middle of the screen ("Victory!", "Defeated..."). */
function banner(scene: Phaser.Scene, text: string, fill: number, color: string): void {
  const { width, height } = { width: 960, height: 640 };
  const band = scene.add.rectangle(width / 2, height * 0.24, width, 90, fill, 0.85).setStrokeStyle(4, INK).setDepth(DEPTH + 3).setScale(1, 0);
  const t = scene.add
    .text(width / 2, height * 0.24, text, { fontFamily: 'system-ui, sans-serif', fontSize: '52px', fontStyle: 'bold', color, stroke: '#1b1530', strokeThickness: 8 })
    .setOrigin(0.5)
    .setDepth(DEPTH + 4)
    .setScale(0.2)
    .setAlpha(0);
  scene.tweens.add({ targets: band, scaleY: 1, duration: 180, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 260, delay: 100, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: [band, t], alpha: 0, duration: 400, delay: 1700, onComplete: () => (band.destroy(), t.destroy()) });
}

/** Victory: your monster hops for joy, confetti falls, and a "Victory!" banner. */
export function victory(scene: Phaser.Scene, sprite: Phaser.GameObjects.Container | undefined): void {
  if (sprite) {
    const y0 = sprite.y;
    scene.tweens.add({ targets: sprite, y: y0 - 30, duration: 160, yoyo: true, repeat: 2, ease: 'Quad.easeOut', onComplete: () => sprite.setY(y0) });
  }
  const colors = [0xff6a1a, 0xffd166, 0x3fae4a, 0x3b9be0, 0xff7ab8, 0x9b6bff];
  for (let i = 0; i < 40; i++) {
    const c = scene.add.rectangle(Math.random() * 960, -10 - Math.random() * 120, 8, 12, colors[i % colors.length]!).setDepth(DEPTH + 2);
    scene.tweens.add({ targets: c, y: 700, x: c.x + (Math.random() - 0.5) * 120, angle: 360 * (Math.random() < 0.5 ? 1 : -1) * 2, duration: 1600 + Math.random() * 900, ease: 'Sine.easeIn', onComplete: () => c.destroy() });
  }
  banner(scene, 'Victory!', 0x2f7a4a, '#ffd166');
}

/** Defeat: the screen dims and a gentle "Defeated..." banner. */
export function defeat(scene: Phaser.Scene): void {
  const dim = scene.add.rectangle(480, 320, 960, 640, 0x0a0816, 0).setDepth(DEPTH + 2);
  scene.tweens.add({ targets: dim, fillAlpha: 0.45, duration: 600, yoyo: true, hold: 1200, onComplete: () => dim.destroy() });
  banner(scene, 'Defeated...', 0x3c2f66, '#cfc6ee');
}

/** Running away: your monster zooms off the left of the screen with speed lines. */
export function runAway(scene: Phaser.Scene, sprite: Phaser.GameObjects.Container | undefined, x: number, y: number): void {
  for (let i = 0; i < 6; i++) {
    const l = scene.add.rectangle(x + 30, y - 40 + i * 16, 60, 4, 0xffffff, 0.9).setStrokeStyle(1, INK).setDepth(DEPTH);
    scene.tweens.add({ targets: l, x: x + 140, alpha: 0, duration: 400, delay: i * 30, onComplete: () => l.destroy() });
  }
  if (sprite) scene.tweens.add({ targets: sprite, x: -200, duration: 500, ease: 'Quad.easeIn' });
}
