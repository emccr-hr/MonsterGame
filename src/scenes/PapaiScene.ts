import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import type { GuideTopic } from '../data/schema';
import { nextGoal, topicsFor } from '../logic/guide';
import { getGame } from '../state/game';
import { reportState } from '../testHook';
import { bindMenuKeys, drawPanel, ListMenu } from '../ui/listMenu';
import { backToMenu, type MenuData } from './MenuScene';

export interface PapaiData extends MenuData {
  /** Opened from the menu (Esc goes back to it) or by talking to him on the map. */
  fromMenu?: boolean;
}

const NEXT = 'What should I do next?';

/**
 * Ask Papai (ADR 0008): the guide answers scripted questions from guide.json, and "What should I do
 * next?" from the game state. No live AI (ADR 0004).
 */
export class PapaiScene extends Phaser.Scene {
  private args!: PapaiData;
  private list!: ListMenu;
  private topics: GuideTopic[] = [];
  private answer!: Phaser.GameObjects.Text;

  constructor() {
    super('Papai');
  }

  init(data: PapaiData): void {
    this.args = data;
  }

  create(): void {
    drawPanel(this, 'Ask Papai', '↑↓: pick a question   Enter: ask   Esc: back', GAME_WIDTH, GAME_HEIGHT);
    drawPapai(this, 120, 210);
    this.topics = topicsFor(content, getGame());
    this.list = new ListMenu(this, 250, 70, { width: 680, fontSize: 19, rowHeight: 30, visibleRows: 10 });
    this.list.onPick = (i) => this.ask(i);
    this.list.setItems([NEXT, ...this.topics.map((t) => t.question)], false);
    this.add.rectangle(20, GAME_HEIGHT - 150, GAME_WIDTH - 40, 112, 0x262046).setOrigin(0).setStrokeStyle(3, 0xf2b134).setDepth(25);
    this.answer = this.add
      .text(40, GAME_HEIGHT - 138, '', { fontFamily: FONT, fontSize: '20px', color: COLORS.text, wordWrap: { width: GAME_WIDTH - 80 }, lineSpacing: 4 })
      .setDepth(30);
    bindMenuKeys(this, {
      up: () => this.list.move(-1),
      down: () => this.list.move(1),
      confirm: () => this.ask(this.list.index),
      back: () => this.leave(),
    });
    this.ask(0);
  }

  private ask(i: number): void {
    const text = i === 0 ? nextGoal(content, getGame()) : (this.topics[i - 1]?.answer ?? '');
    this.answer.setText(text);
    reportState({
      scene: 'Papai',
      menu: [NEXT, ...this.topics.map((t) => t.question)],
      selected: i === 0 ? NEXT : (this.topics[i - 1]?.question ?? null),
      message: text,
    });
  }

  private leave(): void {
    if (this.args.fromMenu) {
      backToMenu(this, this.args);
      return;
    }
    this.scene.stop();
    this.scene.resume(this.args.map);
  }
}

/** Papai's placeholder look (owner-approved mockup): bald, dark mustache, friendly. */
export function drawPapai(scene: Phaser.Scene, x: number, y: number): void {
  const skin = 0xe8b98a;
  const parts = [
    scene.add.rectangle(0, 95, 120, 110, 0x2f7d6b).setStrokeStyle(3, 0x1b1b1b), // shirt
    scene.add.rectangle(0, 38, 34, 20, skin), // neck
    scene.add.ellipse(0, 0, 110, 120, skin).setStrokeStyle(3, 0x1b1b1b), // bald head
    scene.add.ellipse(-56, 4, 16, 26, skin).setStrokeStyle(2, 0x1b1b1b), // ears
    scene.add.ellipse(56, 4, 16, 26, skin).setStrokeStyle(2, 0x1b1b1b),
    scene.add.ellipse(0, -46, 50, 10, 0xffffff, 0.35), // shine on his head
    scene.add.rectangle(-20, -12, 18, 5, 0x2b1d14), // brows
    scene.add.rectangle(20, -12, 18, 5, 0x2b1d14),
    scene.add.circle(-20, 0, 5, 0x1b1b1b), // eyes
    scene.add.circle(20, 0, 5, 0x1b1b1b),
    scene.add.ellipse(0, 26, 66, 18, 0x2b1d14), // big dark mustache
    scene.add.arc(0, 38, 12, 0, 180, false, 0x8a3b2e), // smile
  ];
  scene.add.container(x, y, parts).setDepth(26);
  scene.add
    .text(x, y + 160, 'Papai', { fontFamily: FONT, fontSize: '24px', color: COLORS.title, stroke: '#000000', strokeThickness: 4 })
    .setOrigin(0.5)
    .setDepth(30);
}
