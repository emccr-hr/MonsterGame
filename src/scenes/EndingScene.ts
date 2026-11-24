import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import endingJson from '../data/ending.json';
import { ANSONVILLE } from '../data/maps';
import { ending as endingSchema } from '../data/schema';
import { adventureLines } from '../logic/ending';
import { getGame, saveGame, setGame } from '../state/game';
import { markTipSeen } from '../state/world';
import { reportState } from '../testHook';
import { playMusic } from '../ui/audio';
import { bindMenuKeys } from '../ui/listMenu';
import { drawMonster } from '../ui/monsterArt';
import { besideTile, findAll, startTile } from '../world/grid';

const ending = endingSchema.parse(endingJson);

type Phase = 'story' | 'credits' | 'after';

const STORY_MS = 2600;
const CREDITS_PX_PER_S = 60;

const tipText = (id: string): string => content.guide.tips.find((t) => t.id === id)?.text ?? '';

/**
 * The ending (M6b, Story-Outline.md "Ending(s)"): a few lines after Avatar is beaten, the credits
 * rolling up, then "the game keeps going" (designer, Round 63): back in Ansonville by the arena.
 * Enter or Space moves on (and speeds up the credits); the words are in src/data/ending.json.
 */
export class EndingScene extends Phaser.Scene {
  private phase: Phase = 'story';
  private line = 0;
  private storyText!: Phaser.GameObjects.Text;
  private storyTimer?: Phaser.Time.TimerEvent;
  private credits?: Phaser.GameObjects.Container;
  private creditsTween?: Phaser.Tweens.Tween;
  private shown = '';
  private avatar?: Phaser.GameObjects.Container;

  constructor() {
    super('Ending');
  }

  init(): void {
    this.phase = 'story';
    this.line = 0;
    this.credits = undefined;
    this.creditsTween = undefined;
    this.avatar = undefined;
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x14112b).setOrigin(0);
    playMusic('ansonville');
    const avatar = content.monsters.find((m) => m.kind === 'boss');
    if (avatar) {
      this.avatar = drawMonster(this, { species: avatar.id, big: false }, GAME_WIDTH / 2, 230, 220).setAlpha(0);
      this.tweens.add({ targets: this.avatar, alpha: 0.9, duration: 900 });
    }
    this.storyText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 140, '', { fontFamily: FONT, fontSize: '28px', color: COLORS.text, align: 'center', wordWrap: { width: GAME_WIDTH - 120 } })
      .setOrigin(0.5);
    const tip = markTipSeen('ending') ? tipText('ending') : 'Enter: next';
    this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 12, tip, { fontFamily: FONT, fontSize: '15px', color: COLORS.disabled }).setOrigin(1, 1).setDepth(10);
    bindMenuKeys(this, { confirm: () => this.next(), back: () => this.next() });
    this.showLine();
  }

  private next(): void {
    if (this.phase === 'story') {
      this.line++;
      this.showLine();
    } else if (this.phase === 'credits') {
      // Faster, then on to the last screen once the credits are off the top.
      if (this.creditsTween) this.creditsTween.timeScale = this.creditsTween.timeScale >= 4 ? 4 : this.creditsTween.timeScale * 4;
    } else this.keepPlaying();
  }

  private showLine(): void {
    this.storyTimer?.remove();
    const text = ending.story[this.line];
    if (text === undefined) {
      this.rollCredits();
      return;
    }
    this.storyText.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.storyText, alpha: 1, duration: 300 });
    this.storyTimer = this.time.delayedCall(STORY_MS, () => {
      this.line++;
      this.showLine();
    });
    this.report(text);
  }

  private rollCredits(): void {
    this.phase = 'credits';
    if (this.avatar) this.tweens.add({ targets: this.avatar, alpha: 0.15, duration: 600 });
    this.storyText.setVisible(false);
    const parts: Phaser.GameObjects.Text[] = [];
    let y = 0;
    const add = (text: string, size: number, color: string, gap: number) => {
      parts.push(this.add.text(0, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', wordWrap: { width: GAME_WIDTH - 120 } }).setOrigin(0.5, 0));
      y += gap;
    };
    add('Magic and Monsters', 44, COLORS.title, 90);
    for (const c of ending.credits) {
      add(c.role, 20, COLORS.disabled, 32);
      for (const n of c.names) add(n, 28, COLORS.text, 40);
      y += 26;
    }
    add('Your adventure', 20, COLORS.disabled, 32);
    for (const l of adventureLines(content, getGame())) add(l, 24, COLORS.text, 34);
    this.credits = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT + 20, parts);
    const distance = GAME_HEIGHT + 20 + y + 40;
    this.creditsTween = this.tweens.add({
      targets: this.credits,
      y: -y - 40,
      duration: (distance / CREDITS_PX_PER_S) * 1000,
      onComplete: () => this.showAfter(),
    });
    this.report('credits');
  }

  private showAfter(): void {
    this.phase = 'after';
    this.credits?.destroy();
    this.add.text(GAME_WIDTH / 2, 200, 'The End?', { fontFamily: FONT, fontSize: '56px', color: COLORS.title, stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 320, ending.after, { fontFamily: FONT, fontSize: '26px', color: COLORS.text, align: 'center', wordWrap: { width: GAME_WIDTH - 160 } })
      .setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 440, 'Press Enter to keep playing', { fontFamily: FONT, fontSize: '24px', color: COLORS.selected }).setOrigin(0.5);
    this.report(ending.after);
  }

  /** Back in Ansonville, beside the arena gate. `avatarBeaten` is already saved by the battle. */
  private keepPlaying(): void {
    const gate = findAll(ANSONVILLE, 'A')[0];
    const at = gate ? besideTile(ANSONVILLE, gate) : startTile(ANSONVILLE);
    setGame({ ...getGame(), area: ANSONVILLE.id, tile: at });
    saveGame();
    this.scene.start(ANSONVILLE.name, { at, arrive: tipText('after-avatar') });
  }

  private report(text: string): void {
    this.shown = text;
    reportState({ scene: 'Ending', phase: this.phase, message: this.shown, avatarBeaten: getGame().avatarBeaten });
  }
}
