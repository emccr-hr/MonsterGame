// Loads the vector sprites (M8) found in src/assets/sprites/ and tells scenes whether one exists.
// The file-name rules are in spriteManifest.ts (no Phaser, unit-tested).
import * as Phaser from 'phaser';
import { buildManifest, characterKey, monsterKey, SPRITE_TIERS, svgDataUrl, type SpriteSource } from './spriteManifest';

export const monsterSprites: Record<string, SpriteSource> = buildManifest(
  import.meta.glob<string>('../assets/sprites/monsters/*.svg', { query: '?raw', import: 'default', eager: true }),
  svgDataUrl,
);

export const characterSprites: Record<string, SpriteSource> = buildManifest(
  import.meta.glob<string>('../assets/sprites/characters/*.svg', { query: '?raw', import: 'default', eager: true }),
  svgDataUrl,
);

/** Characters are rasterized this many times their viewBox size (map sprites are tiny, so more). */
const characterScale = (s: SpriteSource): number => (Math.max(s.width, s.height) <= 64 ? 3 : 2);

/** Queues every sprite in a scene's loader (Boot's preload); textures then live for the whole game. */
export function queueSprites(scene: Phaser.Scene): void {
  for (const s of Object.values(monsterSprites)) {
    for (const tier of SPRITE_TIERS) {
      const k = tier / Math.max(s.width, s.height);
      scene.load.svg(monsterKey(s.id, tier), s.url, { width: Math.round(s.width * k), height: Math.round(s.height * k) });
    }
  }
  for (const s of Object.values(characterSprites)) scene.load.svg(characterKey(s.id), s.url, { scale: characterScale(s) });
  // The game runs with pixelArt (crisp text and tiles); smooth filtering suits shrunken vector art better.
  scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string) => {
    if (key.startsWith('monster:') || key.startsWith('character:')) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  });
}

/**
 * A character sprite as an image whose bottom center sits at (x, y), `height` px tall, or undefined
 * when the file is missing (callers keep their old drawing then).
 */
export function addCharacter(scene: Phaser.Scene, id: string, x: number, y: number, height: number): Phaser.GameObjects.Image | undefined {
  const s = characterSprites[id];
  if (!s || !scene.textures.exists(characterKey(id))) return undefined;
  return scene.add
    .image(x, y, characterKey(id))
    .setOrigin(0.5, 1)
    .setDisplaySize((height * s.width) / s.height, height);
}
