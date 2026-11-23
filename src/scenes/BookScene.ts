import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import { bookEntries, bookSummary, type BookEntry } from '../logic/collection';
import { getGame } from '../state/game';
import { markTipSeen } from '../state/world';
import { reportState } from '../testHook';
import { bindMenuKeys, drawPanel } from '../ui/listMenu';
import { drawMonster } from '../ui/monsterArt';
import { backToMenu, type MenuData } from './MenuScene';

const COLS = 6;
const CELL = 68;
const LEFT = 30;
const TOP = 96;
/** Rows on screen at once; the grid scrolls with the cursor (64 monsters since Round 69). */
const VISIBLE_ROWS = 6;

/**
 * The Monster Book (M5, UI-and-HUD.md): every monster in a grid. A "?" until you see it, its
 * picture once seen, ✓ when caught, ★ when caught Big. The counter is the Avatar gate's progress.
 */
export class BookScene extends Phaser.Scene {
  private args!: MenuData;
  private entries: BookEntry[] = [];
  private index = 0;
  private cursor!: Phaser.GameObjects.Rectangle;
  private info!: Phaser.GameObjects.Text;
  private picture?: Phaser.GameObjects.Container;
  /** The top row on screen, and the objects drawn for the rows on screen. */
  private firstRow = 0;
  private cells: Phaser.GameObjects.GameObject[] = [];
  private moreUp!: Phaser.GameObjects.Text;
  private moreDown!: Phaser.GameObjects.Text;

  constructor() {
    super('Book');
  }

  init(data: MenuData): void {
    this.args = data;
    this.index = 0;
    this.firstRow = 0;
    this.cells = [];
    this.picture = undefined;
  }

  create(): void {
    drawPanel(this, 'Monster Book', 'Arrows: look   Esc: back', GAME_WIDTH, GAME_HEIGHT);
    const g = getGame();
    this.entries = bookEntries(content, g);
    const sum = bookSummary(content, g);
    this.add
      .text(LEFT, 60, `Seen ${sum.seen}/${sum.total}   Caught ${sum.caught}/${sum.total}`, { fontFamily: FONT, fontSize: '18px', color: COLORS.text })
      .setDepth(30);
    this.add
      .text(GAME_WIDTH - 24, 22, `Wild monsters caught: ${sum.gate.caught} / ${sum.gate.needed}`, {
        fontFamily: FONT,
        fontSize: '20px',
        color: sum.gate.open ? COLORS.title : COLORS.selected,
      })
      .setOrigin(1, 0)
      .setDepth(30);
    this.add
      .text(GAME_WIDTH - 24, 50, sum.gate.open ? "Avatar's arena is open!" : "Catch them all to open Avatar's arena.", {
        fontFamily: FONT,
        fontSize: '15px',
        color: COLORS.disabled,
      })
      .setOrigin(1, 0)
      .setDepth(30);

    const hint = { fontFamily: FONT, fontSize: '14px', color: COLORS.disabled };
    this.moreUp = this.add.text(LEFT + (COLS * CELL) / 2, TOP - 4, '▲ more', hint).setOrigin(0.5, 1).setDepth(30);
    this.moreDown = this.add.text(LEFT + (COLS * CELL) / 2, TOP + VISIBLE_ROWS * CELL + 2, '▼ more', hint).setOrigin(0.5, 0).setDepth(30);
    this.drawPage();
    this.cursor = this.add.rectangle(0, 0, CELL - 4, CELL - 4).setStrokeStyle(3, 0x7bdff2).setDepth(32);
    this.info = this.add
      .text(LEFT + COLS * CELL + 40, 200, '', { fontFamily: FONT, fontSize: '19px', color: COLORS.text, lineSpacing: 6, wordWrap: { width: 400 } })
      .setDepth(30);

    bindMenuKeys(this, {
      up: () => this.move(-COLS),
      down: () => this.move(COLS),
      left: () => this.move(-1),
      right: () => this.move(1),
      back: () => backToMenu(this, this.args),
      confirm: () => backToMenu(this, this.args),
    });
    this.show();
    if (markTipSeen('book')) this.info.setText(content.guide.tips.find((t) => t.id === 'book')?.text ?? '');
  }

  private cellCenter(i: number): { x: number; y: number } {
    return { x: LEFT + (i % COLS) * CELL + CELL / 2, y: TOP + (Math.floor(i / COLS) - this.firstRow) * CELL + CELL / 2 };
  }

  /** Draws the rows on screen (and only those), plus the "more" hints. */
  private drawPage(): void {
    for (const o of this.cells) o.destroy();
    this.cells = [];
    const end = Math.min(this.entries.length, (this.firstRow + VISIBLE_ROWS) * COLS);
    for (let i = this.firstRow * COLS; i < end; i++) this.drawCell(this.entries[i]!, i);
    this.moreUp.setVisible(this.firstRow > 0);
    this.moreDown.setVisible(end < this.entries.length);
  }

  private drawCell(e: BookEntry, i: number): void {
    const { x, y } = this.cellCenter(i);
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.cells.push(o);
      return o;
    };
    const bg = keep(this.add.rectangle(x, y, CELL - 6, CELL - 6, 0x262046).setDepth(25).setInteractive({ useHandCursor: true }));
    bg.on('pointermove', () => {
      this.index = i;
      this.show();
    });
    if (e.status === 'unseen') {
      keep(this.add.circle(x, y, 20, 0x3a3550).setDepth(26));
      keep(this.add.text(x, y, '?', { fontFamily: FONT, fontSize: '22px', color: COLORS.disabled }).setOrigin(0.5).setDepth(27));
    } else {
      keep(
        drawMonster(this, { species: e.id }, x, y, 46)
          .setDepth(26)
          .setAlpha(e.status === 'caught' ? 1 : 0.45),
      );
    }
    if (e.status === 'caught') {
      keep(this.add.text(x + CELL / 2 - 8, y + CELL / 2 - 8, '✓', { fontFamily: FONT, fontSize: '16px', color: '#5cd65c' }).setOrigin(1).setDepth(28));
    }
    if (e.big) keep(this.add.text(x - CELL / 2 + 6, y - CELL / 2 + 4, '★', { fontFamily: FONT, fontSize: '16px', color: COLORS.title }).setDepth(28));
  }

  private move(step: number): void {
    const next = this.index + step;
    if (next < 0 || next >= this.entries.length) return;
    this.index = next;
    this.show();
  }

  private show(): void {
    const e = this.entries[this.index];
    if (!e) return;
    // Scroll so the cursor's row is on screen.
    const row = Math.floor(this.index / COLS);
    let top = this.firstRow;
    if (row < top) top = row;
    else if (row >= top + VISIBLE_ROWS) top = row - VISIBLE_ROWS + 1;
    if (top !== this.firstRow) {
      this.firstRow = top;
      this.drawPage();
    }
    const c = this.cellCenter(this.index);
    this.cursor.setPosition(c.x, c.y);
    this.picture?.destroy();
    const px = LEFT + COLS * CELL + 120;
    this.picture = e.status === 'unseen' ? undefined : drawMonster(this, { species: e.id }, px, 140, 90).setDepth(30);
    const biome = content.biomes.find((b) => b.id === e.biome)?.name ?? '';
    const status = e.status === 'caught' ? `Caught ✓${e.big ? '  Big ★' : ''}` : e.status === 'seen' ? 'Seen, not caught yet' : 'Not seen yet';
    const kind = e.wild ? `Wild in the ${biome}` : 'Only by growing';
    this.info.setText(`#${this.index + 1}  ${e.name}\n${status}\n${kind}\n\n${e.text}`);
    this.report();
  }

  private report(): void {
    const e = this.entries[this.index];
    reportState({ scene: 'Book', selected: e?.id ?? null, name: e?.name ?? null, status: e?.status ?? null, summary: bookSummary(content, getGame()) });
  }
}
