import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import { mapById } from '../data/maps';
import { canTeleport, pinsInBag, placePin, removePin, teleportChoices, type TeleportChoice } from '../logic/world';
import { getGame, saveGame, setGame } from '../state/game';
import { markTipSeen } from '../state/world';
import { reportState } from '../testHook';
import { playSfx } from '../ui/audio';
import { bindMenuKeys, drawPanel, ListMenu, onKey } from '../ui/listMenu';
import { besideTile, findAll, startTile, type Tile } from '../world/grid';
import { backToMenu, type MenuData } from './MenuScene';

interface Row {
  label: string;
  choice?: TeleportChoice;
  place?: boolean;
}

const tipText = (id: string): string => content.guide.tips.find((t) => t.id === id)?.text ?? '';

/**
 * Teleport (M6b, Mechanics.md "Teleporting"): from level 50, jump to any open shop or to a placed
 * Teleport Pin. Place a pin where you stand; X picks a pin back up (it goes back to the bag).
 */
export class TeleportScene extends Phaser.Scene {
  private args!: MenuData;
  private list!: ListMenu;
  private rows: Row[] = [];
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super('Teleport');
  }

  init(data: MenuData): void {
    this.args = data;
  }

  create(): void {
    drawPanel(this, 'Teleport', 'Enter: go   X: pick up pin   Esc: back', GAME_WIDTH, GAME_HEIGHT);
    this.list = new ListMenu(this, 24, 80, { width: 520, fontSize: 22, rowHeight: 38, visibleRows: 12 });
    this.list.onPick = (i) => this.pick(i);
    this.list.onChange = () => this.report();
    this.message = this.add
      .text(580, 84, '', { fontFamily: FONT, fontSize: '20px', color: COLORS.selected, wordWrap: { width: 350 }, lineSpacing: 4 })
      .setDepth(30);
    bindMenuKeys(this, {
      up: () => this.list.move(-1),
      down: () => this.list.move(1),
      confirm: () => this.pick(this.list.index),
      back: () => backToMenu(this, this.args),
    });
    onKey(this, 'X', () => this.pickUp(this.list.index));
    onKey(this, 'DELETE', () => this.pickUp(this.list.index));
    this.refresh(false);
    if (!canTeleport(content, getGame())) {
      const min = content.items.find((i) => i.effect.kind === 'teleportPin');
      const level = min?.effect.kind === 'teleportPin' ? min.effect.minLevel : 50;
      this.say(`Teleporting works once a monster on your team is level ${level}. Keep battling!`);
    } else if (markTipSeen('teleport')) this.say(tipText('teleport'));
    else this.say('Where to?');
  }

  private refresh(keep = true): void {
    const g = getGame();
    const open = canTeleport(content, g);
    this.rows = open
      ? [{ label: `Place a pin here (${pinsInBag(content, g)} in bag)`, place: true }, ...teleportChoices(content, g).map((c) => ({ label: c.label, choice: c }))]
      : [];
    this.list.setItems(this.rows.length ? this.rows.map((r) => r.label) : ['Back (Esc)'], keep);
    this.report();
  }

  private pick(i: number): void {
    const row = this.rows[i];
    if (!row) {
      backToMenu(this, this.args);
      return;
    }
    if (row.place) this.place();
    else if (row.choice) this.go(row.choice);
  }

  private place(): void {
    const g = getGame();
    const at = g.tile ?? startTile(mapById(g.area));
    const result = placePin(content, g, g.area, at.x, at.y);
    if (!result.ok) {
      this.say(result.reason);
      return;
    }
    setGame(result.state);
    saveGame();
    this.refresh();
    this.say(`Pin placed here! Teleport back to it anytime.`);
  }

  private pickUp(i: number): void {
    const pin = this.rows[i]?.choice?.pin;
    if (!pin) {
      this.say('Pick a pin first, then press X to pick it up.');
      return;
    }
    const result = removePin(content, getGame(), pin.id);
    if (!result.ok) {
      this.say(result.reason);
      return;
    }
    setGame(result.state);
    saveGame();
    this.refresh();
    this.say('You picked up the pin. It is back in your bag.');
  }

  /** Poof: stop the paused map and start the one you picked, at the shop's door or on the pin. */
  private go(choice: TeleportChoice): void {
    const map = mapById(choice.area);
    let at: Tile;
    if (choice.pin) at = { x: choice.pin.x, y: choice.pin.y };
    else {
      const shop = findAll(map, '$')[0];
      at = shop ? besideTile(map, shop) : startTile(map);
    }
    setGame({ ...getGame(), area: map.id, tile: at });
    saveGame();
    playSfx('evolve');
    this.scene.stop(this.args.map);
    this.scene.start(map.name, { at, arrive: `Poof! You teleported to ${choice.label}.` });
  }

  private say(text: string): void {
    this.message.setText(text);
    this.report();
  }

  private report(): void {
    reportState({
      scene: 'Teleport',
      menu: this.rows.map((r) => r.label),
      selected: this.rows[this.list.index]?.label ?? null,
      message: this.message?.text ?? '',
      pins: getGame().pins.map((p) => ({ ...p })),
      pinsInBag: pinsInBag(content, getGame()),
    });
  }
}
