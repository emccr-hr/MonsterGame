// The sharp-rendering math (src/ui/display.ts), with no Phaser import so it's unit-tested.
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

/** How many canvas pixels per world pixel, for this screen: 1 or 2 (2 is sharp, and safe for slower computers). */
export function renderScaleFor(windowWidth: number, windowHeight: number, devicePixelRatio: number): number {
  const fit = Math.min(windowWidth / GAME_WIDTH, windowHeight / GAME_HEIGHT) * (devicePixelRatio || 1);
  return Math.min(2, Math.max(1, Math.ceil(fit - 0.05)));
}

/** Camera scroll that keeps a target in the middle of a view, inside a world of the given size. */
export function cameraScrollFor(target: number, view: number, world: number): number {
  return Math.round(Math.min(Math.max(0, target - view / 2), Math.max(0, world - view)));
}
