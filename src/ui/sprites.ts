// Loads the vector sprites (M8) found in src/assets/sprites/ and tells scenes whether one exists.
// The file-name rules are in spriteManifest.ts (no Phaser, unit-tested).
import * as Phaser from 'phaser';
import { buildManifest, monsterKey, rasterScale, SPRITE_TIERS, spriteKey, svgDataUrl, type SpriteGroup, type SpriteSource } from './spriteManifest';

export const monsterSprites: Record<string, SpriteSource> = buildManifest(
  import.meta.glob<string>('../assets/sprites/monsters/*.svg', { query: '?raw', import: 'default', eager: true }),
  svgDataUrl,
);

export const characterSprites: Record<string, SpriteSource> = buildManifest(
  import.meta.glob<string>('../assets/sprites/characters/*.svg', { query: '?raw', import: 'default', eager: true }),
  svgDataUrl,
);

/** Items (cage, potion, ...) by item id from items.json, plus "gem". */
export const itemSprites: Record<string, SpriteSource> = buildManifest(
  import.meta.glob<string>('../assets/sprites/items/*.svg', { query: '?raw', import: 'default', eager: true }),
  svgDataUrl,
);

/** Map art: shop, reviver, gate-<biome>-open/-locked, tree-<area>. */
export const tileSprites: Record<string, SpriteSource> = buildManifest(
  import.meta.glob<string>('../assets/sprites/tiles/*.svg', { query: '?raw', import: 'default', eager: true }),
  svgDataUrl,
);

const GROUPS: Record<SpriteGroup, Record<string, SpriteSource>> = { character: characterSprites, item: itemSprites, tile: tileSprites };

/** Queues every sprite in a scene's loader (Boot's preload); textures then live for the whole game. */
export function queueSprites(scene: Phaser.Scene): void {
  for (const s of Object.values(monsterSprites)) {
    for (const tier of SPRITE_TIERS) {
      const k = tier / Math.max(s.width, s.height);
      scene.load.svg(monsterKey(s.id, tier), s.url, { width: Math.round(s.width * k), height: Math.round(s.height * k) });
    }
  }
  for (const [group, list] of Object.entries(GROUPS) as [SpriteGroup, Record<string, SpriteSource>][])
    for (const s of Object.values(list)) scene.load.svg(spriteKey(group, s.id), s.url, { scale: rasterScale(s) });
  // The game runs with pixelArt (crisp text and tiles); smooth filtering suits shrunken vector art better.
  scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string) => {
    if (/^(monster|character|item|tile):/.test(key)) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  });
}

/**
 * A character sprite as an image whose bottom center sits at (x, y), `height` px tall, or undefined
 * when the file is missing (callers keep their old drawing then).
 */
export function addCharacter(scene: Phaser.Scene, id: string, x: number, y: number, height: number): Phaser.GameObjects.Image | undefined {
  return addSprite(scene, 'character', id, x, y, height)?.setOrigin(0.5, 1);
}

/**
 * Any non-monster sprite as an image centered on (x, y) with its longest side `size` px, or
 * undefined when the file is missing (callers keep their old drawing then).
 */
export function addSprite(scene: Phaser.Scene, group: SpriteGroup, id: string, x: number, y: number, size: number): Phaser.GameObjects.Image | undefined {
  const s = GROUPS[group][id];
  const key = spriteKey(group, id);
  if (!s || !scene.textures.exists(key)) return undefined;
  const k = size / Math.max(s.width, s.height);
  return scene.add.image(x, y, key).setDisplaySize(s.width * k, s.height * k);
}
