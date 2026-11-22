import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { reportState } from '../testHook';
import { queueSprites } from '../ui/sprites';

/** Loads the vector sprites (M8), then shows the title screen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading...', { fontFamily: FONT, fontSize: '28px', color: COLORS.text })
      .setOrigin(0.5);
    queueSprites(this);
  }

  create(): void {
    reportState({ scene: 'Boot' });
    this.scene.start('Title');
  }
}
