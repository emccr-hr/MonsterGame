import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import { monsterLine } from '../logic/collection';
import { penXpPerMinute, putInPen, takeFromPen } from '../logic/pen';
import { species, type MonsterInstance } from '../logic/monster';
import { getGame, saveGame, setGame } from '../state/game';
import { markTipSeen } from '../state/world';
import { reportState } from '../testHook';
import { bindMenuKeys, drawPanel, ListMenu } from '../ui/listMenu';

type Side = 'mine' | 'pen';

export interface PenData {
  /** The paused map's scene key. */
  map: string;
}

/**
 * Ansonville's monster pen (designer, Round 89): your monsters on the left, the pen on the right.
 * Enter moves the picked monster across. Pen monsters can't battle, and they grow over real time.
 */
export class PenScene extends Phaser.Scene {
  private args!: PenData;
  private mine!: ListMenu;
  private pen!: ListMenu;
  private focus: Side = 'mine';
  private mineOrder: MonsterInstance[] = [];
  private changed = false;
  private penHeader!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super('Pen');
  }

  init(data: PenData): void {
    this.args = data;
    this.focus = 'mine';
    this.changed = false;
  }

  create(): void {
    drawPanel(this, 'Monster Pen', 'Enter: move it in or out   ←→: other side   Esc: leave', GAME_WIDTH, GAME_HEIGHT);
    const style = { fontFamily: FONT, fontSize: '18px', color: COLORS.title };
    this.add.text(30, 64, 'Your monsters', style).setDepth(30);
    this.penHeader = this.add.text(500, 64, '', style).setDepth(30);
    this.mine = new ListMenu(this, 24, 92, { width: 440, fontSize: 19, rowHeight: 32, visibleRows: 10 });
    this.pen = new ListMenu(this, 494, 92, { width: 440, fontSize: 19, rowHeight: 32, visibleRows: content.rules.pen.size });
    this.mine.onChange = () => this.setFocus('mine');
    this.pen.onChange = () => this.setFocus('pen');
    this.mine.onPick = (i) => this.move('mine', i);
    this.pen.onPick = (i) => this.move('pen', i);
    this.add
      .text(500, 92 + 32 * content.rules.pen.size + 16, 'Monsters in the pen walk around and\ngrow while you play. They can\'t battle\nuntil you take them out.', {
        fontFamily: FONT,
        fontSize: '16px',
        color: COLORS.text,
        lineSpacing: 4,
      })
      .setDepth(30);
    this.message = this.add
      .text(30, GAME_HEIGHT - 60, '', { fontFamily: FONT, fontSize: '18px', color: COLORS.selected, wordWrap: { width: GAME_WIDTH - 60 } })
      .setDepth(30);
    bindMenuKeys(this, {
      up: () => this.current().move(-1),
      down: () => this.current().move(1),
      left: () => this.setFocus('mine'),
      right: () => this.setFocus('pen'),
      confirm: () => this.move(this.focus, this.current().index),
      back: () => this.leave(),
    });
    this.refresh();
    if (markTipSeen('pen')) this.say(content.guide.tips.find((t) => t.id === 'pen')?.text ?? '');
  }

  private current(): ListMenu {
    return this.focus === 'mine' ? this.mine : this.pen;
  }

  private setFocus(side: Side): void {
    this.focus = side;
    this.mine.focused = side === 'mine';
    this.pen.focused = side === 'pen';
    this.mine.draw();
    this.pen.draw();
    this.report();
  }

  private refresh(): void {
    const g = getGame();
    this.mineOrder = [...g.team, ...g.backpack];
    const rows = this.mineOrder.map((m, i) => `${i < g.team.length ? 'Team: ' : ''}${monsterLine(content, m)}`);
    this.mine.setItems(rows.length ? rows : ['(none)']);
    const penRows = g.pen.map((m) => `${monsterLine(content, m)}  (+${penXpPerMinute(content, m.level)} XP/min)`);
    this.pen.setItems(penRows.length ? penRows : ['(empty)']);
    this.penHeader.setText(`Pen ${g.pen.length}/${content.rules.pen.size}`);
    this.setFocus(this.focus);
  }

  private move(side: Side, i: number): void {
    const g = getGame();
    const m = side === 'mine' ? this.mineOrder[i] : g.pen[i];
    if (!m) return;
    const r = side === 'mine' ? putInPen(content, g, m.uid) : takeFromPen(content, g, m.uid);
    if (!r.ok) {
      this.say(r.reason);
      return;
    }
    setGame(r.state);
    saveGame();
    this.changed = true;
    const name = species(content, m.species).name;
    this.say(side === 'mine' ? `${name} is in the pen. It will grow while you play!` : `${name} came out of the pen.`);
    this.refresh();
  }

  private leave(): void {
    if (this.changed) {
      // Restart the map so the pen shows who is in it now (this also stops this screen).
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
      scene: 'Pen',
      focus: this.focus,
      selected: this.current().index,
      message: this.message?.text ?? '',
      pen: g.pen.map((m) => ({ uid: m.uid, species: m.species, level: m.level, xp: m.xp })),
      team: g.team.map((m) => ({ uid: m.uid, species: m.species })),
    });
  }
}
