import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import { buyRow, maxAffordable, shopRows, type ShopRow } from '../logic/shop';
import { getGame, saveGame, setGame } from '../state/game';
import { markTipSeen } from '../state/world';
import { reportState } from '../testHook';
import { bindMenuKeys, drawPanel, ListMenu } from '../ui/listMenu';

export interface ShopData {
  /** The paused map's scene key. */
  map: string;
}

/**
 * The shop (M6, UI-and-HUD.md "Shop"): cages, potions, snacks, teleport pins, and a map part for each
 * locked biome. Pick a row, ←→ to change how many, Enter to buy, Enter again to say yes.
 */
export class ShopScene extends Phaser.Scene {
  private args!: ShopData;
  private list!: ListMenu;
  private rows: ShopRow[] = [];
  private qty = 1;
  private confirming = false;
  private opened: string[] = [];
  private gemsText!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super('Shop');
  }

  init(data: ShopData): void {
    this.args = data;
    this.qty = 1;
    this.confirming = false;
    this.opened = [];
  }

  create(): void {
    drawPanel(this, 'Shop', '↑↓: pick   ←→: how many   Enter: buy   Esc: leave', GAME_WIDTH, GAME_HEIGHT);
    this.gemsText = this.add
      .text(GAME_WIDTH - 24, 24, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.title })
      .setOrigin(1, 0)
      .setDepth(30);
    this.list = new ListMenu(this, 24, 80, { width: 470, fontSize: 21, rowHeight: 38, visibleRows: 9 });
    this.list.onChange = () => {
      this.qty = 1;
      this.confirming = false;
      this.showInfo();
    };
    this.list.onPick = () => this.buy();
    this.info = this.add
      .text(520, 90, '', { fontFamily: FONT, fontSize: '20px', color: COLORS.text, lineSpacing: 8, wordWrap: { width: 410 } })
      .setDepth(30);
    this.message = this.add
      .text(30, GAME_HEIGHT - 64, '', { fontFamily: FONT, fontSize: '19px', color: COLORS.selected, wordWrap: { width: GAME_WIDTH - 60 } })
      .setDepth(30);
    bindMenuKeys(this, {
      up: () => this.list.move(-1),
      down: () => this.list.move(1),
      left: () => this.changeQty(-1),
      right: () => this.changeQty(1),
      confirm: () => this.buy(),
      back: () => (this.confirming ? this.cancel() : this.leave()),
    });
    this.refresh();
    if (markTipSeen('shop')) this.say(content.guide.tips.find((t) => t.id === 'shop')?.text ?? '');
  }

  private row(): ShopRow | undefined {
    return this.rows[this.list.index];
  }

  private refresh(): void {
    const g = getGame();
    this.rows = shopRows(content, g);
    this.gemsText.setText(`${g.gems} Magic Gems`);
    this.list.setItems(this.rows.map((r) => `${r.name}  ${r.price} gems${r.kind === 'item' ? `  (you have ${r.owned})` : ''}`));
    this.showInfo();
  }

  private changeQty(step: number): void {
    const r = this.row();
    if (!r || r.kind === 'mapPart') return;
    const max = Math.max(1, maxAffordable(r, getGame().gems));
    this.qty = Math.min(max, Math.max(1, this.qty + step));
    this.confirming = false;
    this.showInfo();
  }

  private showInfo(): void {
    const r = this.row();
    if (!r) {
      this.info.setText('');
      return;
    }
    const total = r.price * this.qty;
    const how = r.kind === 'mapPart' ? 'Buy it and the gate opens right away!' : `How many: ◀ ${this.qty} ▶   Total: ${total} gems`;
    const ask = this.confirming ? `\n\nBuy ${r.kind === 'mapPart' ? r.name : `${this.qty} ${r.name}`} for ${total} gems?\nEnter: yes   Esc: no` : '';
    this.info.setText(`${r.name}\n${r.description}\n\n${how}${ask}`);
    this.report();
  }

  private buy(): void {
    const r = this.row();
    if (!r) return;
    if (!this.confirming) {
      if (getGame().gems < r.price * this.qty) {
        this.say(`You need ${r.price * this.qty} Magic Gems. Win battles to earn more!`);
        return;
      }
      this.confirming = true;
      this.say('');
      this.showInfo();
      return;
    }
    const result = buyRow(content, getGame(), r, this.qty);
    this.confirming = false;
    if (!result.ok) {
      this.say(result.reason);
      this.showInfo();
      return;
    }
    setGame(result.state);
    saveGame();
    if (r.kind === 'mapPart') {
      this.opened.push(r.id);
      this.say(`The ${content.biomes.find((b) => b.id === r.id)?.name} gate is open! Go explore!`);
    } else {
      this.say(`You bought ${this.qty} ${r.name}!`);
    }
    this.qty = 1;
    this.refresh();
  }

  private cancel(): void {
    this.confirming = false;
    this.showInfo();
  }

  /** Back to the map. If a gate opened, the map redraws so the gate shows open. */
  private leave(): void {
    if (this.opened.length > 0) {
      // Restart the map where the player stands (this also stops the shop).
      this.scene.stop(this.args.map);
      this.scene.start(this.args.map, { at: getGame().tile ?? undefined });
      return;
    }
    this.scene.stop();
    this.scene.resume(this.args.map);
  }

  private say(text: string): void {
    this.message.setText(text);
    this.report();
  }

  private report(): void {
    const g = getGame();
    reportState({
      scene: 'Shop',
      menu: this.rows.map((r) => r.name),
      selected: this.row()?.name ?? null,
      qty: this.qty,
      confirming: this.confirming,
      message: this.message?.text ?? '',
      gems: g.gems,
      bag: { ...g.bag },
      openBiomes: [...g.openBiomes],
    });
  }
}
