// A simple text list for menu screens (M5): arrow keys move, Enter picks, the mouse hovers and
// clicks. It scrolls when there are more rows than fit. No game rules here.
import type * as Phaser from 'phaser';
import { COLORS, FONT } from '../config';

export interface ListOptions {
  width: number;
  rowHeight?: number;
  fontSize?: number;
  /** Rows shown at once; the list scrolls past this. */
  visibleRows?: number;
}

export class ListMenu {
  private labels: string[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private more?: Phaser.GameObjects.Text;
  private top = 0;
  /** -1 when the list is empty. */
  index = 0;
  /** Dimmed when another list has the focus. */
  focused = true;
  /** Row being "held" (picked up to swap); drawn in yellow. */
  held: number | null = null;
  onPick: (i: number) => void = () => {};
  onChange: (i: number) => void = () => {};

  private readonly rowH: number;
  private readonly size: number;
  private readonly rows: number;

  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly y: number;
  private readonly opts: ListOptions;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ListOptions) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.opts = opts;
    this.rowH = opts.rowHeight ?? 34;
    this.size = opts.fontSize ?? 22;
    this.rows = opts.visibleRows ?? 8;
  }

  get length(): number {
    return this.labels.length;
  }

  setItems(labels: string[], keepIndex = true): void {
    this.labels = labels;
    if (!keepIndex) this.index = 0;
    this.index = labels.length === 0 ? -1 : Math.min(Math.max(0, this.index), labels.length - 1);
    this.draw();
  }

  move(step: number): void {
    if (this.labels.length === 0) return;
    this.index = (this.index + step + this.labels.length) % this.labels.length;
    this.draw();
    this.onChange(this.index);
  }

  select(i: number): void {
    if (i < 0 || i >= this.labels.length) return;
    this.index = i;
    this.draw();
    this.onChange(i);
  }

  destroy(): void {
    for (const t of this.texts) t.destroy();
    this.more?.destroy();
    this.texts = [];
  }

  draw(): void {
    this.destroy();
    if (this.index >= 0) {
      if (this.index < this.top) this.top = this.index;
      if (this.index >= this.top + this.rows) this.top = this.index - this.rows + 1;
    }
    this.top = Math.max(0, Math.min(this.top, Math.max(0, this.labels.length - this.rows)));
    const shown = this.labels.slice(this.top, this.top + this.rows);
    this.texts = shown.map((label, k) => {
      const i = this.top + k;
      const isSel = i === this.index && this.focused;
      const color = this.held === i ? COLORS.title : isSel ? COLORS.selected : this.focused ? COLORS.text : COLORS.disabled;
      const t = this.scene.add
        .text(this.x, this.y + k * this.rowH, `${isSel ? '> ' : '  '}${label}`, {
          fontFamily: FONT,
          fontSize: `${this.size}px`,
          color,
          fixedWidth: this.opts.width,
        })
        .setDepth(30)
        .setInteractive({ useHandCursor: true });
      t.on('pointermove', () => {
        if (this.index !== i || !this.focused) {
          this.focused = true;
          this.select(i);
        }
      });
      t.on('pointerdown', () => {
        this.select(i);
        this.onPick(i);
      });
      return t;
    });
    if (this.labels.length > this.rows) {
      const end = Math.min(this.labels.length, this.top + this.rows);
      this.more = this.scene.add
        .text(this.x + this.opts.width, this.y + this.rows * this.rowH, `${this.top + 1}-${end} of ${this.labels.length}`, {
          fontFamily: FONT,
          fontSize: '14px',
          color: COLORS.disabled,
        })
        .setOrigin(1, 0)
        .setDepth(30);
    }
  }
}

export interface KeyHandlers {
  up?: () => void;
  down?: () => void;
  left?: () => void;
  right?: () => void;
  confirm?: () => void;
  back?: () => void;
}

/**
 * Adds a key handler that ignores the first moment after the screen opens: the key press that
 * opened this screen is otherwise handled again by it in the same frame.
 */
export function onKey(scene: Phaser.Scene, key: string, fn: (e: KeyboardEvent) => void): void {
  const readyAt = performance.now() + 150;
  scene.input.keyboard?.on(`keydown-${key}`, (e: KeyboardEvent) => {
    if (performance.now() >= readyAt) fn(e);
  });
}

/** Arrows/WASD, Enter/Space, Esc/Backspace (Controls.md). */
export function bindMenuKeys(scene: Phaser.Scene, h: KeyHandlers): void {
  const on = (keys: string[], fn?: () => void) => {
    if (fn) for (const k of keys) onKey(scene, k, fn);
  };
  on(['UP', 'W'], h.up);
  on(['DOWN', 'S'], h.down);
  on(['LEFT', 'A'], h.left);
  on(['RIGHT', 'D'], h.right);
  on(['ENTER', 'SPACE'], h.confirm);
  on(['ESC', 'BACKSPACE'], h.back);
}

/** A dark full-screen panel with a title, for menu screens drawn on top of the map. */
export function drawPanel(scene: Phaser.Scene, title: string, hint: string, width: number, height: number): void {
  scene.add.rectangle(0, 0, width, height, 0x14112b, 0.96).setOrigin(0).setDepth(20);
  scene.add
    .text(24, 16, title, { fontFamily: FONT, fontSize: '30px', color: COLORS.title, stroke: '#000000', strokeThickness: 4 })
    .setDepth(30);
  scene.add
    .text(width - 20, height - 12, hint, { fontFamily: FONT, fontSize: '15px', color: COLORS.disabled })
    .setOrigin(1, 1)
    .setDepth(30);
}
