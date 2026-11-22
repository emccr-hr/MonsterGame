import * as Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { mapById } from '../data/maps';
import { getGame, hasSave, loadGame } from '../state/game';
import { markReady, reportState } from '../testHook';

interface MenuItem {
  label: string;
  enabled: boolean;
  text?: Phaser.GameObjects.Text;
}

/** Title screen: the game's name, then New Game / Continue. Arrow keys or W/S, Enter or Space, or the mouse. */
export class TitleScene extends Phaser.Scene {
  private items: MenuItem[] = [];
  private selected = 0;
  private message?: Phaser.GameObjects.Text;

  constructor() {
    super('Title');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, GAME_HEIGHT * 0.3, 'Magic and Monsters', {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '64px',
        color: COLORS.title,
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.items = [
      { label: 'New Game', enabled: true },
      { label: 'Continue', enabled: hasSave() },
    ];
    this.selected = 0;

    this.items.forEach((item, i) => {
      const text = this.add
        .text(cx, GAME_HEIGHT * 0.58 + i * 56, item.label, {
          fontFamily: 'Trebuchet MS, Arial, sans-serif',
          fontSize: '36px',
          color: COLORS.text,
        })
        .setOrigin(0.5);
      if (item.enabled) {
        text.setInteractive({ useHandCursor: true });
        text.on('pointerover', () => this.select(i));
        text.on('pointerdown', () => {
          this.select(i);
          this.choose();
        });
      }
      item.text = text;
    });

    this.message = this.add
      .text(cx, GAME_HEIGHT * 0.88, '', {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '24px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const keys = this.input.keyboard;
    keys?.on('keydown-UP', () => this.move(-1));
    keys?.on('keydown-W', () => this.move(-1));
    keys?.on('keydown-DOWN', () => this.move(1));
    keys?.on('keydown-S', () => this.move(1));
    keys?.on('keydown-ENTER', () => this.choose());
    keys?.on('keydown-SPACE', () => this.choose());

    this.refresh();
    markReady();
  }

  /** Moves the highlight up or down, skipping items that are turned off. */
  private move(step: number): void {
    const n = this.items.length;
    for (let tries = 1; tries <= n; tries++) {
      const next = (this.selected + step * tries + n * tries) % n;
      if (this.items[next]?.enabled) {
        this.select(next);
        return;
      }
    }
  }

  private select(index: number): void {
    this.selected = index;
    this.refresh();
  }

  private choose(): void {
    const item = this.items[this.selected];
    if (!item?.enabled) return;
    if (item.label === 'New Game') {
      this.scene.start('PickBiome');
      return;
    }
    const problem = loadGame();
    if (problem) {
      this.message?.setText(problem);
      this.refresh();
      return;
    }
    const g = getGame();
    this.scene.start(mapById(g.area).name, g.tile ? { at: g.tile } : {});
  }

  private refresh(): void {
    this.items.forEach((item, i) => {
      const color = !item.enabled ? COLORS.disabled : i === this.selected ? COLORS.selected : COLORS.text;
      item.text?.setColor(color);
      item.text?.setText(i === this.selected ? `> ${item.label} <` : item.label);
    });
    reportState({
      scene: 'Title',
      selected: this.items[this.selected]?.label,
      menu: this.items.map(({ label, enabled }) => ({ label, enabled })),
      message: this.message?.text ?? '',
    });
  }
}
