// Sharp rendering (owner, 2026-11-23): the canvas scale for a screen, and the map camera's scroll.
import { describe, expect, it } from 'vitest';
import { cameraScrollFor, renderScaleFor } from '../../../src/ui/displayMath';

describe('render scale', () => {
  it('matches the screen: bigger windows and sharper screens get more canvas pixels', () => {
    expect(renderScaleFor(960, 640, 1)).toBe(1);
    expect(renderScaleFor(1280, 800, 1)).toBe(2); // the window is a bit bigger than the game: draw at 2x, not stretched
    expect(renderScaleFor(1920, 1080, 1)).toBe(2);
    expect(renderScaleFor(1440, 900, 2)).toBe(2); // a sharp laptop screen (capped at 2)
    expect(renderScaleFor(800, 500, 1)).toBe(1);
  });

  it('never goes over 2 (speed on slower computers) or under 1', () => {
    expect(renderScaleFor(3840, 2160, 2)).toBe(2);
    expect(renderScaleFor(300, 200, 0)).toBe(1);
  });
});

describe('map camera', () => {
  it('keeps the player in the middle, but never shows past the map edges', () => {
    expect(cameraScrollFor(600, 960, 1216)).toBe(120);
    expect(cameraScrollFor(100, 960, 1216)).toBe(0);
    expect(cameraScrollFor(1200, 960, 1216)).toBe(256);
    expect(cameraScrollFor(300, 960, 800)).toBe(0); // a map smaller than the view stays put
  });
});
