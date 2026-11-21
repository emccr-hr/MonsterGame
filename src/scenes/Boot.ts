import * as Phaser from 'phaser';
import { reportState } from '../testHook';

/** Loads shared assets (none yet), then shows the title screen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    reportState({ scene: 'Boot' });
    this.scene.start('Title');
  }
}
