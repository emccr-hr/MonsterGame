// Item pictures (M8) for the Shop and the Bag: one image that follows the highlighted item.
// Sprites are src/assets/sprites/items/<item id>.svg; no picture if the file is missing.
import type * as Phaser from 'phaser';
import { addSprite } from './sprites';

export class ItemPicture {
  private image?: Phaser.GameObjects.Image;
  private shown?: string;

  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly y: number;
  private readonly size: number;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.size = size;
  }

  /** Shows this item's picture (undefined hides it). */
  show(itemId: string | undefined): void {
    if (itemId === this.shown) return;
    this.shown = itemId;
    this.image?.destroy();
    this.image = itemId ? addSprite(this.scene, 'item', itemId, this.x, this.y, this.size)?.setDepth(30) : undefined;
  }
}
