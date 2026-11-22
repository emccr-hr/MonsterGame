import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getGame, saveGame } from '../state/game';
import { reportState } from '../testHook';
import { bindMenuKeys, ListMenu, onKey } from '../ui/listMenu';

/** Every menu screen gets the paused map's scene key, so it can go back to it. */
export interface MenuData {
  map: string;
  /** Menu row to start on (coming back from a screen). */
  select?: string;
}

interface Entry {
  label: string;
  /** Scene to open, or an action. */
  open?: string;
  run?: () => string;
}

/**
 * The game menu (M5, UI-and-HUD.md "Menu button (M)"): Team, Bag, Monster Book, Save. Opened with
 * M on any map, which pauses the map; Esc or M closes it and the map carries on.
 */
export class MenuScene extends Phaser.Scene {
  private args!: MenuData;
  private list!: ListMenu;
  private entries: Entry[] = [];
  private note!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  init(data: MenuData): void {
    this.args = data;
  }

  create(): void {
    const w = 300;
    const h = 330;
    const x = GAME_WIDTH - w - 20;
    this.add.rectangle(x, 20, w, h, 0x14112b, 0.95).setOrigin(0).setStrokeStyle(3, 0xffd166).setDepth(20);
    const g = getGame();
    this.add
      .text(x + 20, 32, `Menu`, { fontFamily: FONT, fontSize: '26px', color: COLORS.title })
      .setDepth(30);
    this.add
      .text(x + w - 16, 38, `${g.gems} Magic Gems`, { fontFamily: FONT, fontSize: '16px', color: COLORS.text })
      .setOrigin(1, 0)
      .setDepth(30);

    this.entries = [
      { label: `Team (${g.team.length}) and Backpack (${g.backpack.length})`, open: 'Team' },
      { label: 'Bag', open: 'Bag' },
      { label: 'Monster Book', open: 'Book' },
      {
        label: 'Save',
        run: () => {
          saveGame();
          return 'Game saved!';
        },
      },
      { label: 'Close (Esc)' },
    ];
    this.list = new ListMenu(this, x + 16, 80, { width: w - 32, fontSize: 20, rowHeight: 40, visibleRows: 6 });
    this.list.onPick = (i) => this.choose(i);
    this.list.onChange = () => this.report();
    const start = this.args.select ? this.entries.findIndex((e) => e.open === this.args.select) : 0;
    this.list.index = Math.max(0, start);
    this.list.setItems(this.entries.map((e) => e.label));
    this.note = this.add
      .text(x + 20, 20 + h - 40, '', { fontFamily: FONT, fontSize: '16px', color: COLORS.selected })
      .setDepth(30);

    bindMenuKeys(this, {
      up: () => this.list.move(-1),
      down: () => this.list.move(1),
      confirm: () => this.choose(this.list.index),
      back: () => this.close(),
    });
    onKey(this, 'M', () => this.close());
    this.report();
  }

  private choose(i: number): void {
    const e = this.entries[i];
    if (!e) return;
    if (e.open) {
      this.scene.start(e.open, { map: this.args.map } satisfies MenuData);
      return;
    }
    if (e.run) {
      this.note.setText(e.run());
      this.report();
      return;
    }
    this.close();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume(this.args.map);
  }

  private report(): void {
    reportState({
      scene: 'Menu',
      menu: this.entries.map((e) => e.label),
      selected: this.entries[this.list.index]?.label ?? null,
      message: this.note?.text ?? '',
    });
  }
}

/** Back from a menu screen to the menu, on the row for that screen. */
export function backToMenu(scene: Phaser.Scene, data: MenuData): void {
  scene.scene.start('Menu', { map: data.map, select: scene.scene.key } satisfies MenuData);
}

export const SCREEN = { w: GAME_WIDTH, h: GAME_HEIGHT };
