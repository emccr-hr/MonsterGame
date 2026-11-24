import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import { BACKPACK_SORTS, monsterLine, sortedBackpack, swapTeamSlots, type BackpackSort } from '../logic/collection';
import { swapWithBackpack, toBackpack, toTeam, type GameState, type Result } from '../logic/game';
import { xpToNext } from '../logic/growth';
import { species, type MonsterInstance } from '../logic/monster';
import { canRide, canSwim, startRide, stopRide } from '../logic/riding';
import { mapById } from '../data/maps';
import { kindAt } from '../world/grid';
import { getGame, saveGame, setGame } from '../state/game';
import { markTipSeen } from '../state/world';
import { reportState } from '../testHook';
import { bindMenuKeys, drawPanel, ListMenu, onKey } from '../ui/listMenu';
import { drawMonster } from '../ui/monsterArt';
import { backToMenu, type MenuData } from './MenuScene';

type Side = 'team' | 'backpack';

const PUT_AWAY = '▼ Put it in the backpack';

/**
 * Team (6) and Backpack (unlimited), side by side (UI-and-HUD.md): pick up a monster with Enter,
 * then Enter on another to swap. The first team monster leads in battle. Tab sorts the backpack.
 */
export class TeamScene extends Phaser.Scene {
  private args!: MenuData;
  private team!: ListMenu;
  private pack!: ListMenu;
  private focus: Side = 'team';
  private held: { side: Side; uid: number } | null = null;
  private sort: BackpackSort = 'caught';
  private packOrder: MonsterInstance[] = [];
  private packHeader!: Phaser.GameObjects.Text;
  private teamHeader!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private details: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Team');
  }

  init(data: MenuData): void {
    this.args = data;
    this.focus = 'team';
    this.held = null;
    this.details = [];
  }

  create(): void {
    drawPanel(this, 'Team and Backpack', 'Enter: pick up, then swap   ←→: other side   Tab: sort   R: ride   Esc: back', GAME_WIDTH, GAME_HEIGHT);
    const style = { fontFamily: FONT, fontSize: '18px', color: COLORS.title };
    this.teamHeader = this.add.text(30, 64, '', style).setDepth(30);
    this.packHeader = this.add.text(500, 64, '', style).setDepth(30).setInteractive({ useHandCursor: true });
    this.packHeader.on('pointerdown', () => this.nextSort());
    this.team = new ListMenu(this, 24, 92, { width: 440, fontSize: 19, rowHeight: 32, visibleRows: content.rules.teamSize });
    this.pack = new ListMenu(this, 494, 92, { width: 440, fontSize: 19, rowHeight: 32, visibleRows: 7 });
    this.team.onChange = () => this.setFocus('team');
    this.pack.onChange = () => this.setFocus('backpack');
    this.team.onPick = (i) => this.choose('team', i);
    this.pack.onPick = (i) => this.choose('backpack', i);
    this.message = this.add
      .text(30, GAME_HEIGHT - 60, '', { fontFamily: FONT, fontSize: '18px', color: COLORS.selected, wordWrap: { width: GAME_WIDTH - 60 } })
      .setDepth(30);

    bindMenuKeys(this, {
      up: () => this.current().move(-1),
      down: () => this.current().move(1),
      left: () => this.setFocus('team'),
      right: () => this.setFocus('backpack'),
      confirm: () => this.choose(this.focus, this.current().index),
      back: () => this.back(),
    });
    // Riding (Round 88): R gets on (or off) the picked starred Big monster.
    onKey(this, 'R', () => this.toggleRide());
    onKey(this, 'TAB', (e) => {
      e.preventDefault();
      this.nextSort();
    });
    this.refresh();
    if (markTipSeen('team')) this.say(content.guide.tips.find((t) => t.id === 'team')?.text ?? '');
  }

  private current(): ListMenu {
    return this.focus === 'team' ? this.team : this.pack;
  }

  private setFocus(side: Side): void {
    this.focus = side;
    this.team.focused = side === 'team';
    this.pack.focused = side === 'backpack';
    this.team.draw();
    this.pack.draw();
    this.showDetails();
    this.report();
  }

  private nextSort(): void {
    this.sort = BACKPACK_SORTS[(BACKPACK_SORTS.indexOf(this.sort) + 1) % BACKPACK_SORTS.length]!;
    this.refresh();
  }

  /** Rebuilds both lists from the game state. */
  private refresh(): void {
    const g = getGame();
    const size = content.rules.teamSize;
    this.teamHeader.setText(`Team ${g.team.length}/${size}  (the first one leads)`);
    this.packHeader.setText(`Backpack ${g.backpack.length}   Sort: ${this.sort} (Tab)`);
    const teamRows = Array.from({ length: size }, (_, i) => {
      const m = g.team[i];
      return m ? `${i + 1}. ${monsterLine(content, m)}${m.uid === g.riding ? '  (riding)' : ''}` : `${i + 1}. (empty)`;
    });
    this.packOrder = sortedBackpack(content, g.backpack, this.sort);
    const packRows = this.packOrder.map((m) => `${monsterLine(content, m)}${m.uid === g.riding ? '  (riding)' : ''}`);
    if (this.held?.side === 'team') packRows.unshift(PUT_AWAY);
    if (packRows.length === 0) packRows.push('(empty)');
    this.team.held = this.held?.side === 'team' ? g.team.findIndex((m) => m.uid === this.held!.uid) : null;
    this.pack.held = this.held?.side === 'backpack' ? this.packRowOf(this.held.uid) : null;
    this.team.setItems(teamRows);
    this.pack.setItems(packRows);
    this.setFocus(this.focus);
  }

  private packOffset(): number {
    return this.held?.side === 'team' ? 1 : 0;
  }

  private packRowOf(uid: number): number {
    return this.packOrder.findIndex((m) => m.uid === uid) + this.packOffset();
  }

  /** The monster on a row, or null for an empty slot or the put-away row. */
  private monsterAt(side: Side, i: number): MonsterInstance | null {
    if (side === 'team') return getGame().team[i] ?? null;
    return this.packOrder[i - this.packOffset()] ?? null;
  }

  private choose(side: Side, i: number): void {
    const target = this.monsterAt(side, i);
    const held = this.held;
    if (!held) {
      if (!target) return;
      this.held = { side, uid: target.uid };
      this.say(`Picked up ${species(content, target.species).name}. Now pick where it goes. (Esc: cancel)`);
      this.refresh();
      return;
    }
    if (target?.uid === held.uid) {
      this.cancelHold();
      return;
    }
    const g = getGame();
    let result: Result<GameState> | null = null;
    if (held.side === 'team') {
      const from = g.team.findIndex((m) => m.uid === held.uid);
      if (side === 'team') result = target ? swapTeamSlots(g, from, i) : swapTeamSlots(g, from, g.team.length - 1);
      else result = target ? swapWithBackpack(g, held.uid, target.uid) : toBackpack(g, held.uid);
    } else if (side === 'team') {
      result = target ? swapWithBackpack(g, target.uid, held.uid) : toTeam(content, g, held.uid);
    } else if (target) {
      this.held = { side, uid: target.uid };
      this.say(`Picked up ${species(content, target.species).name} instead.`);
      this.refresh();
      return;
    }
    if (!result) return;
    if (!result.ok) {
      this.say(result.reason);
      return;
    }
    setGame(result.state);
    saveGame();
    this.held = null;
    this.say('Done!');
    this.refresh();
  }

/** Get on the picked monster, or off it if you're riding it already (Round 88). */
  private toggleRide(): void {
    if (this.held) return;
    const m = this.monsterAt(this.focus, this.current().index);
    if (!m) return;
    const g = getGame();
    const name = species(content, m.species).name;
    if (g.riding === m.uid) {
      const tile = g.tile;
      const onWater = !!tile && kindAt(mapById(g.area), tile) === 'water';
      const r = stopRide(g, onWater);
      if (!r.ok) return this.say(r.reason);
      setGame(r.state);
      saveGame();
      this.say(`You got off ${name}.`);
    } else {
      const r = startRide(content, g, m.uid);
      if (!r.ok) return this.say(r.reason);
      setGame(r.state);
      saveGame();
      this.say(`You're riding ${name}! You go faster${canSwim(content, m) ? ', and it can swim across water' : ''}.`);
    }
    this.refresh();
  }

  private cancelHold(): void {
    this.held = null;
    this.say('');
    this.refresh();
  }

  private back(): void {
    if (this.held) this.cancelHold();
    else backToMenu(this, this.args);
  }

  private say(text: string): void {
    this.message.setText(text);
    this.report();
  }

  private showDetails(): void {
    for (const d of this.details) d.destroy();
    this.details = [];
    const m = this.monsterAt(this.focus, this.current().index);
    if (!m) return;
    const s = species(content, m.species);
    const y = 345;
    const sprite = drawMonster(this, m, 90, y + 50, 90).setDepth(30);
    const moves = m.moves.map((id) => content.moves.find((x) => x.id === id)?.name ?? id).join(', ');
    const evo = s.evolvesTo;
    const into = evo ? (getGame().seen.includes(evo.monster) ? species(content, evo.monster).name : '???') : null;
    const lines = [
      `${m.big ? 'BIG ' : ''}${s.name}   Level ${m.level}   ${m.level >= content.rules.levelCap ? 'Max level!' : `${xpToNext(m.level) - m.xp} XP to next level`}`,
      `Moves: ${moves}`,
      evo ? `Grows into ${into} at level ${evo.level}.` : 'Fully grown.',
    ];
    const text = this.add
      .text(170, y, lines.join('\n'), { fontFamily: FONT, fontSize: '17px', color: COLORS.text, lineSpacing: 6, wordWrap: { width: GAME_WIDTH - 200 } })
      .setDepth(30);
    this.details = [sprite, text];
    if (canRide(m)) {
      // A Ride button for starred Big monsters (Round 88), for the mouse; R does the same.
      const riding = getGame().riding === m.uid;
      const button = this.add
        .text(170, y + 92, riding ? '[ Get off (R) ]' : '[ Ride (R) ]', { fontFamily: FONT, fontSize: '18px', color: COLORS.selected, backgroundColor: '#00000066', padding: { x: 8, y: 4 } })
        .setDepth(30)
        .setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.toggleRide());
      this.details.push(button);
    }
  }

  private report(): void {
    const g = getGame();
    reportState({
      scene: 'Team',
      focus: this.focus,
      selected: this.current().index,
      held: this.held,
      sort: this.sort,
      message: this.message?.text ?? '',
      team: g.team.map((m) => ({ uid: m.uid, species: m.species, level: m.level, hp: m.hp })),
      backpack: this.packOrder.map((m) => ({ uid: m.uid, species: m.species, level: m.level })),
    });
  }
}
