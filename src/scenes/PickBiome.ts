import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import { ANSONVILLE } from '../data/maps';
import { startNewGame } from '../state/world';
import { reportState } from '../testHook';

/** New Game: the player picks the first biome to open (Mechanics.md, Start of the game). */
export class PickBiomeScene extends Phaser.Scene {
  private selected = 0;
  private rows: Phaser.GameObjects.Text[] = [];
  private look?: Phaser.GameObjects.Text;

  constructor() {
    super('PickBiome');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const biomes = content.biomes;
    this.selected = 0;

    this.add
      .text(cx, 60, 'Pick your first place to explore!', { fontFamily: FONT, fontSize: '40px', color: COLORS.title })
      .setOrigin(0.5);
    this.add
      .text(cx, 110, 'You can open the others later with map parts.', { fontFamily: FONT, fontSize: '22px', color: COLORS.text })
      .setOrigin(0.5);

    this.rows = biomes.map((b, i) => {
      const text = this.add
        .text(cx, 175 + i * 52, b.name, { fontFamily: FONT, fontSize: '34px', color: COLORS.text })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.select(i));
      text.on('pointerdown', () => {
        this.select(i);
        this.choose();
      });
      return text;
    });

    this.look = this.add.text(cx, 448, '', { fontFamily: FONT, fontSize: '24px', color: COLORS.selected }).setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT - 36, 'Arrows to pick, Enter to go. Esc to go back.', {
        fontFamily: FONT,
        fontSize: '18px',
        color: COLORS.disabled,
      })
      .setOrigin(0.5);

    const keys = this.input.keyboard;
    keys?.on('keydown-UP', () => this.move(-1));
    keys?.on('keydown-W', () => this.move(-1));
    keys?.on('keydown-DOWN', () => this.move(1));
    keys?.on('keydown-S', () => this.move(1));
    keys?.on('keydown-ENTER', () => this.choose());
    keys?.on('keydown-SPACE', () => this.choose());
    keys?.on('keydown-ESC', () => this.scene.start('Title'));
    keys?.on('keydown-BACKSPACE', () => this.scene.start('Title'));

    this.refresh();
  }

  private move(step: number): void {
    const n = this.rows.length;
    this.select((this.selected + step + n) % n);
  }

  private select(i: number): void {
    this.selected = i;
    this.refresh();
  }

  private choose(): void {
    const biome = content.biomes[this.selected];
    if (!biome) return;
    startNewGame(biome.id);
    this.scene.start(ANSONVILLE.name);
  }

  private refresh(): void {
    const biomes = content.biomes;
    this.rows.forEach((text, i) => {
      const name = biomes[i]?.name ?? '';
      text.setColor(i === this.selected ? COLORS.selected : COLORS.text);
      text.setText(i === this.selected ? `> ${name} <` : name);
    });
    this.look?.setText(biomes[this.selected]?.look ?? '');
    reportState({ scene: 'PickBiome', selected: biomes[this.selected]?.id, options: biomes.map((b) => b.id) });
  }
}
