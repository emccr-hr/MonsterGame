import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import { evolveMonster } from '../logic/collection';
import { species } from '../logic/monster';
import { getGame, saveGame, setGame } from '../state/game';
import { reportState } from '../testHook';
import { onKey } from '../ui/listMenu';
import { drawMonster } from '../ui/monsterArt';

export interface EvolveData {
  /** Monsters to evolve, one after the other. */
  uids: number[];
  /** The paused map to resume after. */
  map: string;
}

const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2 - 30;

/**
 * Evolution (M5): after a battle, each team monster that reached its own evolve level grows into its
 * next form, with a short glow-and-grow animation. Enter or Space skips ahead.
 */
export class EvolveScene extends Phaser.Scene {
  private args!: EvolveData;
  private queue: number[] = [];
  private text!: Phaser.GameObjects.Text;
  private sprite?: Phaser.GameObjects.Container;
  private waiting = false;
  private next: () => void = () => {};

  constructor() {
    super('Evolve');
  }

  init(data: EvolveData): void {
    this.args = data;
    this.queue = [...data.uids];
    this.sprite = undefined;
    this.waiting = false;
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0d0b1e).setOrigin(0);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.add.rectangle(CX, CY, 6, 420, 0x2b2360).setRotation(a).setAlpha(0.6);
    }
    this.add.rectangle(20, GAME_HEIGHT - 110, GAME_WIDTH - 40, 90, 0x14112b, 0.95).setOrigin(0).setStrokeStyle(3, 0xffd166);
    this.text = this.add.text(40, GAME_HEIGHT - 92, '', { fontFamily: FONT, fontSize: '26px', color: COLORS.text, wordWrap: { width: GAME_WIDTH - 80 } });
    const skip = () => {
      if (this.waiting) {
        this.waiting = false;
        this.time.removeAllEvents();
        this.next();
      }
    };
    onKey(this, 'ENTER', skip);
    onKey(this, 'SPACE', skip);
    this.input.on('pointerdown', skip);
    this.evolveNext();
  }

  /** Waits `ms` (or a key press), then runs `then`. */
  private wait(ms: number, then: () => void): void {
    this.waiting = true;
    this.next = then;
    this.time.delayedCall(ms, () => {
      if (!this.waiting) return;
      this.waiting = false;
      then();
    });
  }

  private evolveNext(): void {
    const uid = this.queue.shift();
    if (uid === undefined) {
      this.done();
      return;
    }
    const result = evolveMonster(content, getGame(), uid);
    if (!result.ok) {
      this.evolveNext();
      return;
    }
    const from = species(content, result.from.species).name;
    const to = species(content, result.to.species).name;
    setGame(result.state);
    saveGame();

    this.sprite?.destroy();
    this.sprite = drawMonster(this, result.from, CX, CY);
    this.say(`What? ${from} is changing!`);
    this.tweens.add({ targets: this.sprite, alpha: 0.2, duration: 220, yoyo: true, repeat: 4 });
    this.wait(2200, () => {
      this.sprite?.destroy();
      this.sprite = drawMonster(this, result.to, CX, CY).setScale(0.3);
      this.tweens.add({ targets: this.sprite, scale: 1, duration: 500, ease: 'Back.easeOut' });
      this.say(`${from} grew into ${to}!`);
      this.wait(2200, () => this.evolveNext());
    });
  }

  private done(): void {
    this.scene.stop();
    this.scene.resume(this.args.map);
  }

  private say(text: string): void {
    this.text.setText(text);
    reportState({ scene: 'Evolve', message: text, team: getGame().team.map((m) => ({ species: m.species, level: m.level })) });
  }
}
