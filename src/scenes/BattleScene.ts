import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import { mapById } from '../data/maps';
import { activeOf, invalidReason, resolveTurn, type Action, type BattleEvent, type BattleState, type SideId } from '../logic/battle';
import { bagMenu, eventText, mainMenu, moveMenu, sideName, targetMenu, teamMenu, type MenuChoice } from '../logic/battleUi';
import { readyToEvolve } from '../logic/collection';
import { finishBattle, startWildEncounter } from '../logic/encounter';
import { maxHp, species } from '../logic/monster';
import type { Rng } from '../logic/rng';
import { gameRng, getGame, saveGame, setGame } from '../state/game';
import { markTipSeen } from '../state/world';
import { reportState } from '../testHook';
import { drawMonster } from '../ui/monsterArt';
import { playMusic, playSfx } from '../ui/audio';
import { addSprite } from '../ui/sprites';
import { besideTile, findAll, startTile } from '../world/grid';
import type { EvolveData } from './EvolveScene';
import type { WildEncounterEvent } from './events';

type Phase = 'text' | 'menu' | 'fight' | 'bag' | 'target' | 'team' | 'done';

const TEXT_MS = 1100;
const ENEMY_AT = { x: GAME_WIDTH * 0.72, y: 170 };
const PLAYER_AT = { x: GAME_WIDTH * 0.25, y: 300 };

interface HpBar {
  box: Phaser.GameObjects.Container;
  name: Phaser.GameObjects.Text;
  fill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

/** One line of text to show, with what to update on screen when it shows. */
interface Beat {
  text: string;
  /** Runs when the line appears (HP bars, sprites, the cage). */
  show?: () => void;
  /** How long the line stays before moving on by itself (Space or Enter skips). */
  ms?: number;
}

/**
 * A wild encounter (M4): catch or battle on M2's rules. Runs on top of the paused map scene and
 * resumes it after; losing wakes you at the last Reviver. Vector-style placeholder art.
 */
export class BattleScene extends Phaser.Scene {
  private from!: WildEncounterEvent;
  private battle!: BattleState;
  private rng!: Rng;
  private phase: Phase = 'text';
  private beats: Beat[] = [];
  private beatTimer?: Phaser.Time.TimerEvent;
  private afterBeats: () => void = () => {};
  private choices: MenuChoice[] = [];
  private selected = 0;
  private fast = false;
  private message = '';

  private enemySprite?: Phaser.GameObjects.Container;
  private playerSprite?: Phaser.GameObjects.Container;
  private enemyBar!: HpBar;
  private playerBar!: HpBar;
  private textBox!: Phaser.GameObjects.Text;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private speedText!: Phaser.GameObjects.Text;

  constructor() {
    super('Battle');
  }

  init(data: WildEncounterEvent): void {
    this.from = data;
    this.phase = 'text';
    this.beats = [];
    this.beatTimer = undefined;
    this.choices = [];
    this.selected = 0;
    this.menuTexts = [];
    this.enemySprite = undefined;
    this.playerSprite = undefined;
  }

  create(): void {
    this.rng = gameRng();
    const started = startWildEncounter(content, getGame(), this.from.biomeId, this.rng);
    setGame(started.state);
    this.battle = started.battle;

    this.drawBackground();
    playMusic('battle');
    this.enemyBar = this.makeBar(40, 40);
    this.playerBar = this.makeBar(GAME_WIDTH - 360, 300);
    this.enemySprite = drawMonster(this, activeOf(this.battle.enemy)!.m, ENEMY_AT.x, ENEMY_AT.y);
    this.refreshSide('enemy');
    this.refreshSide('player');

    const box = this.add.rectangle(20, GAME_HEIGHT - 130, GAME_WIDTH - 40, 110, 0x14112b, 0.95).setOrigin(0);
    box.setStrokeStyle(3, 0xffd166);
    this.textBox = this.add.text(40, GAME_HEIGHT - 116, '', {
      fontFamily: FONT,
      fontSize: '24px',
      color: COLORS.text,
      wordWrap: { width: GAME_WIDTH * 0.55 },
    });
    this.speedText = this.add
      .text(GAME_WIDTH - 12, 8, '', { fontFamily: FONT, fontSize: '16px', color: COLORS.disabled })
      .setOrigin(1, 0);
    this.updateSpeedText();
    this.setupInput();

    const wild = activeOf(this.battle.enemy)!.m;
    const first = this.battle.player.team.length === 0;
    const lines: Beat[] = [{ text: `A wild ${wild.big ? 'BIG ' : ''}${species(content, wild.species).name} appears!` }];
    if (first) lines.push({ text: tipText('first-catch'), ms: 2600 });
    else {
      const lead = activeOf(this.battle.player);
      if (lead) lines.push({ text: `Go, ${species(content, lead.m.species).name}!`, show: () => this.refreshSide('player') });
      if (markTipSeen('battle')) lines.push({ text: tipText('battle'), ms: 2600 });
    }
    this.play(lines, () => this.openMenu());
  }

  // ---- Input ---------------------------------------------------------------------------------

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-UP', () => this.moveSelection(-1));
    kb.on('keydown-W', () => this.moveSelection(-1));
    kb.on('keydown-DOWN', () => this.moveSelection(1));
    kb.on('keydown-S', () => this.moveSelection(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ESC', () => this.back());
    kb.on('keydown-BACKSPACE', () => this.back());
    kb.on('keydown-F', () => {
      this.fast = !this.fast;
      this.updateSpeedText();
    });
  }

  private moveSelection(step: number): void {
    if (!this.isMenu() || this.choices.length === 0) return;
    this.selected = (this.selected + step + this.choices.length) % this.choices.length;
    this.drawMenu();
  }

  private confirm(): void {
    if (this.phase === 'text') {
      this.nextBeat();
      return;
    }
    if (!this.isMenu()) return;
    const choice = this.choices[this.selected];
    if (choice) this.pick(choice);
  }

  /** Esc: back from a sub-menu (not when you must pick your next monster). */
  private back(): void {
    if (this.phase === 'text') {
      this.nextBeat();
      return;
    }
    if (this.phase === 'target') {
      this.pick({ label: 'Bag', pick: { kind: 'bag' } });
      return;
    }
    if ((this.phase === 'fight' || this.phase === 'bag' || this.phase === 'team') && !this.battle.mustSwitch) this.openMenu();
  }

  private isMenu(): boolean {
    return this.phase === 'menu' || this.phase === 'fight' || this.phase === 'bag' || this.phase === 'target' || this.phase === 'team';
  }

  // ---- Menus ---------------------------------------------------------------------------------

  private openMenu(): void {
    if (this.battle.mustSwitch) {
      this.showChoices('team', teamMenu(content, this.battle), 'Pick your next monster!');
      return;
    }
    this.showChoices('menu', mainMenu(this.battle), 'What will you do?');
  }

  private showChoices(phase: Phase, choices: MenuChoice[], prompt: string): void {
    this.phase = phase;
    this.choices = choices;
    this.selected = 0;
    this.setMessage(prompt);
    this.drawMenu();
  }

  private pick(choice: MenuChoice): void {
    const p = choice.pick;
    if (p.kind === 'fight') return this.showChoices('fight', moveMenu(content, this.battle), 'Pick a move. (Esc: back)');
    if (p.kind === 'bag') {
      const items = bagMenu(content, this.battle);
      if (items.length === 0) return this.setMessage('Nothing in your bag can help right now.');
      return this.showChoices('bag', items, 'Pick an item. (Esc: back)');
    }
    if (p.kind === 'target') return this.showChoices('target', targetMenu(content, this.battle, p.item), 'Who gets it? (Esc: back)');
    if (p.kind === 'team') {
      const team = teamMenu(content, this.battle);
      if (team.length === 0) return this.setMessage('No other monster can fight right now.');
      return this.showChoices('team', team, 'Who goes in? (Esc: back)');
    }
    this.act(p);
  }

  private drawMenu(): void {
    for (const t of this.menuTexts) t.destroy();
    const x = GAME_WIDTH * 0.62;
    const top = GAME_HEIGHT - 124;
    const many = this.choices.length > 4;
    this.menuTexts = this.choices.map((c, i) => {
      const col = many ? Math.floor(i / 3) : Math.floor(i / 4);
      const row = many ? i % 3 : i % 4;
      const size = many ? 22 : this.choices.length > 3 ? 20 : 24;
      const t = this.add
        .text(x + col * 170, top + row * (many ? 32 : 25), `${i === this.selected ? '> ' : '  '}${c.label}`, {
          fontFamily: FONT,
          fontSize: `${size}px`,
          color: i === this.selected ? COLORS.selected : COLORS.text,
        })
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => {
        this.selected = i;
        this.drawMenu();
      });
      t.on('pointerdown', () => {
        this.selected = i;
        this.confirm();
      });
      return t;
    });
    this.report();
  }

  private clearMenu(): void {
    for (const t of this.menuTexts) t.destroy();
    this.menuTexts = [];
    this.choices = [];
  }

  // ---- Turns ---------------------------------------------------------------------------------

  private act(action: Action): void {
    const why = invalidReason(content, this.battle, action);
    if (why) {
      this.setMessage(why);
      return;
    }
    const before = this.battle;
    const { state, events } = resolveTurn(content, before, action, this.rng);
    this.battle = state;
    this.clearMenu();
    this.play(this.beatsFor(events), () => (this.battle.outcome ? this.finish() : this.openMenu()));
  }

  /** Turns battle events into lines of text plus the screen changes that go with them. */
  private beatsFor(events: BattleEvent[]): Beat[] {
    const beats: Beat[] = [];
    for (const e of events) {
      const text = eventText(content, this.battle, e);
      const show = this.showFor(e);
      if (e.type === 'throw') {
        beats.push({ text: 'You throw a cage!', show: () => this.throwCage(e.throw.wobbles, e.throw.result === 'caught'), ms: 900 + 450 * e.throw.wobbles });
      }
      if (text) beats.push({ text, show });
      else if (show) {
        // No line of its own (damage): attach it to the line before, or show it right away.
        const last = beats[beats.length - 1];
        if (last) {
          const prev = last.show;
          last.show = () => {
            prev?.();
            show();
          };
        } else beats.push({ text: '', show, ms: 300 });
      }
    }
    return beats;
  }

  private showFor(e: BattleEvent): (() => void) | undefined {
    switch (e.type) {
      case 'damage':
      case 'burnHurt':
        return () => {
          this.refreshSide(e.side, e.hp);
          this.flash(e.side);
        };
      case 'heal':
        return () => this.refreshSide(e.side, e.side === 'player' && e.index !== this.battle.player.active ? undefined : e.hp);
      case 'faint':
        return () => {
          const sprite = e.side === 'enemy' ? this.enemySprite : this.playerSprite;
          if (sprite) this.tweens.add({ targets: sprite, alpha: 0, y: sprite.y + 30, duration: 300 });
        };
      case 'switch':
        return () => this.refreshSide('player');
      case 'dig':
        return () => {
          const sprite = e.side === 'enemy' ? this.enemySprite : this.playerSprite;
          sprite?.setAlpha(0.25);
        };
      case 'move':
        return () => {
          const sprite = e.side === 'enemy' ? this.enemySprite : this.playerSprite;
          sprite?.setAlpha(1);
          if (sprite) this.tweens.add({ targets: sprite, x: sprite.x + (e.side === 'player' ? 24 : -24), duration: 90, yoyo: true });
        };
      default:
        return undefined;
    }
  }

  // ---- Ending --------------------------------------------------------------------------------

  private finish(): void {
    const ended = this.battle;
    const { state, rewards } = finishBattle(content, getGame(), ended, this.rng);
    setGame(state);
    saveGame();

    const lines: Beat[] = [];
    if (rewards.caught) {
      const name = species(content, rewards.caught.species).name;
      lines.push({ text: rewards.caughtToTeam ? `${name} joined your team!` : `${name} went to your backpack.` });
    }
    if (ended.outcome === 'won') {
      lines.push({ text: `Your team got ${rewards.xp} XP and ${rewards.gems} Magic Gems!` });
      for (const [uid, levels] of Object.entries(rewards.levelUps)) {
        const m = state.team.find((x) => x.uid === Number(uid));
        if (m) lines.push({ text: `${species(content, m.species).name} grew to level ${m.level}!${levels > 1 ? ` (+${levels})` : ''}`, show: () => playSfx('level-up') });
      }
    }
    if (ended.outcome === 'lost') {
      const where = mapById(state.lastReviver).name;
      lines.push({ text: `You wake up at the Reviver in ${where}. Your monsters are all better!` });
    }
    this.play(lines, () => this.leave());
  }

  private leave(): void {
    this.phase = 'done';
    this.report();
    const g = getGame();
    if (this.battle.outcome === 'lost') {
      const map = mapById(g.lastReviver);
      const reviver = findAll(map, 'R')[0];
      const at = reviver ? besideTile(map, reviver) : startTile(map);
      setGame({ ...g, area: map.id, tile: at });
      saveGame();
      this.scene.stop(this.from.sceneKey);
      this.scene.start(map.name, { at });
      return;
    }
    // Anyone on the team at their evolve level grows now (M5), then the map carries on.
    const ready = readyToEvolve(content, g).filter((m) => g.team.some((t) => t.uid === m.uid));
    this.scene.stop();
    if (ready.length > 0) this.scene.run('Evolve', { uids: ready.map((m) => m.uid), map: this.from.sceneKey } satisfies EvolveData);
    else this.scene.resume(this.from.sceneKey);
  }

  // ---- Text beats ----------------------------------------------------------------------------

  private play(beats: Beat[], then: () => void): void {
    this.phase = 'text';
    this.beats = [...beats];
    this.afterBeats = then;
    this.nextBeat();
  }

  private nextBeat(): void {
    this.beatTimer?.remove();
    this.beatTimer = undefined;
    const beat = this.beats.shift();
    if (!beat) {
      const then = this.afterBeats;
      this.afterBeats = () => {};
      then();
      return;
    }
    beat.show?.();
    if (beat.text) this.setMessage(beat.text);
    const ms = (beat.ms ?? TEXT_MS) / (this.fast ? 2 : 1);
    this.beatTimer = this.time.delayedCall(ms, () => this.nextBeat());
  }

  private setMessage(text: string): void {
    this.message = text;
    this.textBox.setText(text);
    this.report();
  }

  private updateSpeedText(): void {
    this.speedText.setText(this.fast ? 'Speed 2x (F)' : 'Speed 1x (F)');
    this.report();
  }

  // ---- Drawing -------------------------------------------------------------------------------

  private drawBackground(): void {
    const p = mapById(this.from.biomeId).palette;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, p.ground).setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.3, 0x9ad7ff).setOrigin(0).setAlpha(0.6);
    const shadow = Phaser.Display.Color.IntegerToColor(p.encounter).darken(15).color;
    this.add.ellipse(ENEMY_AT.x, ENEMY_AT.y + 70, 300, 60, shadow);
    this.add.ellipse(PLAYER_AT.x, PLAYER_AT.y + 70, 300, 60, shadow);
  }

  private makeBar(x: number, y: number): HpBar {
    const bg = this.add.rectangle(0, 0, 320, 78, 0x14112b, 0.85).setOrigin(0).setStrokeStyle(2, 0xffffff);
    const name = this.add.text(12, 8, '', { fontFamily: FONT, fontSize: '20px', color: COLORS.text });
    const track = this.add.rectangle(12, 42, 296, 14, 0x3a3550).setOrigin(0);
    const fill = this.add.rectangle(12, 42, 296, 14, 0x5cd65c).setOrigin(0);
    const label = this.add.text(308, 58, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.text }).setOrigin(1, 0);
    const box = this.add.container(x, y, [bg, name, track, fill, label]);
    return { box, name, fill, label };
  }

  /** Redraws one side's HP bar (and the player's sprite when the monster changed). */
  private refreshSide(side: SideId, hpOverride?: number): void {
    const team = side === 'enemy' ? this.battle.enemy : this.battle.player;
    const bar = side === 'enemy' ? this.enemyBar : this.playerBar;
    const c = activeOf(team);
    if (!c) {
      bar.box.setVisible(false);
      return;
    }
    if (side === 'player') {
      const shown = this.playerSprite?.getData('uid') as number | undefined;
      if (shown !== c.m.uid) {
        this.playerSprite?.destroy();
        this.playerSprite = drawMonster(this, c.m, PLAYER_AT.x, PLAYER_AT.y, undefined, { flip: true }).setData('uid', c.m.uid);
      }
    }
    const max = maxHp(content, c.m);
    const hp = Math.max(0, Math.min(max, hpOverride ?? c.m.hp));
    bar.box.setVisible(true);
    bar.name.setText(`${capitalize(sideName(content, this.battle, side))}  Lv ${c.m.level}${c.m.burned > 0 ? '  (burned)' : ''}`);
    const ratio = hp / max;
    this.tweens.add({ targets: bar.fill, width: 296 * ratio, duration: 250 });
    bar.fill.setFillStyle(ratio > 0.5 ? 0x5cd65c : ratio > 0.2 ? 0xf2c14e : 0xe5484d);
    bar.label.setText(`${hp} / ${max} HP`);
  }

  private flash(side: SideId): void {
    const sprite = side === 'enemy' ? this.enemySprite : this.playerSprite;
    if (sprite) this.tweens.add({ targets: sprite, alpha: 0.3, duration: 70, yoyo: true, repeat: 1 });
  }

  /** The tiny cage flies at the wild monster, grows big, wobbles, then holds or breaks. */
  private throwCage(wobbles: number, caught: boolean): void {
    // The golden cage sprite (M8), or the old bars if its file is missing.
    const look = addSprite(this, 'item', 'cage', 0, 0, 64);
    const cage = this.add.container(
      PLAYER_AT.x,
      PLAYER_AT.y - 40,
      look
        ? [look]
        : [
            this.add.rectangle(0, 0, 60, 60, 0xffffff, 0.15).setStrokeStyle(4, 0xc9a227),
            this.add.rectangle(-15, 0, 4, 60, 0xc9a227),
            this.add.rectangle(0, 0, 4, 60, 0xc9a227),
            this.add.rectangle(15, 0, 4, 60, 0xc9a227),
          ],
    );
    cage.setScale(0.2);
    playSfx('cage-throw');
    const wild = this.enemySprite;
    this.tweens.chain({
      targets: cage,
      tweens: [
        { x: ENEMY_AT.x, y: ENEMY_AT.y, scale: 1.6, duration: 450, ease: 'Quad.easeOut' },
        ...Array.from({ length: wobbles }, () => ({ angle: 15, duration: 110, yoyo: true, repeat: 1, delay: 100 })),
      ],
      onComplete: () => {
        playSfx(caught ? 'catch' : 'break-free');
        if (caught) {
          wild?.setVisible(false);
          this.tweens.add({ targets: cage, scale: 1, duration: 200 });
        } else {
          this.tweens.add({ targets: cage, alpha: 0, scale: 2.2, duration: 250, onComplete: () => cage.destroy() });
        }
      },
    });
    wild?.setAlpha(0.4);
    this.time.delayedCall(450, () => wild?.setAlpha(caught ? 0.4 : 1));
  }

  private report(): void {
    const view = (side: SideId) => {
      const c = activeOf(side === 'enemy' ? this.battle.enemy : this.battle.player);
      return c ? { species: c.m.species, level: c.m.level, hp: c.m.hp, maxHp: maxHp(content, c.m) } : null;
    };
    reportState({
      scene: 'Battle',
      phase: this.phase,
      message: this.message,
      menu: this.isMenu() ? this.choices.map((c) => c.label) : [],
      selected: this.isMenu() ? (this.choices[this.selected]?.label ?? null) : null,
      outcome: this.battle?.outcome ?? null,
      enemy: this.battle ? view('enemy') : null,
      player: this.battle ? view('player') : null,
      team: currentTeamSize(),
      fast: this.fast,
    });
  }
}

const tipText = (id: string): string => content.guide.tips.find((t) => t.id === id)?.text ?? '';

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function currentTeamSize(): number {
  try {
    return getGame().team.length;
  } catch {
    return 0;
  }
}
