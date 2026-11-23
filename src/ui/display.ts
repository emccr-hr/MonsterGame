// Sharp rendering (owner, 2026-11-23: "the pixelation... makes the text appear blurred").
// Every scene is laid out in a 960x640 world (GAME_WIDTH x GAME_HEIGHT). Before, the canvas was that
// size too and the browser stretched it up with chunky pixels. Now the canvas is RENDER_SCALE times
// bigger (matched to the screen), every camera zooms by RENDER_SCALE from its top-left corner, and
// text and sprites are drawn at that resolution, so the layout is the same but everything is crisp.
import * as Phaser from 'phaser';
import { renderScaleFor } from './displayMath';

export { cameraScrollFor, renderScaleFor } from './displayMath';

/**
 * Canvas pixels per world pixel. Smoke tests (?test) run in a headless browser that draws without a
 * graphics card, where a bigger canvas is very slow, so they keep 1 (the math is unit-tested).
 */
export const RENDER_SCALE: number =
  typeof window === 'undefined' || new URLSearchParams(window.location.search).has('test')
    ? 1
    : renderScaleFor(window.innerWidth, window.innerHeight, window.devicePixelRatio);

/** Zoom a scene's camera so the 960x640 world fills the bigger canvas. Phaser zooms around the
 * camera's middle by default, which would move screen-fixed HUD items, so zoom from the top-left. */
export function fitCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE);
}

/** Every scene gets the zoom when it starts, and every text is drawn at the canvas resolution. */
export function installSharpRendering(game: Phaser.Game): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
    text: (...args: unknown[]) => Phaser.GameObjects.Text;
  };
  const text = factory.text;
  factory.text = function (this: unknown, ...args: unknown[]) {
    return text.apply(this, args).setResolution(RENDER_SCALE);
  };
  const hook = () => {
    for (const scene of game.scene.scenes) scene.events.on(Phaser.Scenes.Events.CREATE, () => fitCamera(scene));
  };
  // The game boots at once but adds its scenes on READY (after textures load), so wait for them.
  if (game.scene.scenes.length) hook();
  else game.events.once(Phaser.Core.Events.READY, hook);
}
