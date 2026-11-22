import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { content } from '../data';
import { itemTargetProblem, monsterLine } from '../logic/collection';
import { useHealingItem } from '../logic/world';
import { getGame, saveGame, setGame } from '../state/game';
import { reportState } from '../testHook';
import { ItemPicture } from '../ui/itemArt';
import { bindMenuKeys, drawPanel, ListMenu } from '../ui/listMenu';
import { backToMenu, type MenuData } from './MenuScene';

/**
 * The Bag (M5): every item you carry. Pick a Potion or Wake-Up Snack, then pick which team
 * monster gets it (the target picker). Cages and pins are used elsewhere.
 */
export class BagScene extends Phaser.Scene {
  private args!: MenuData;
  private items!: ListMenu;
  private targets!: ListMenu;
  private itemIds: string[] = [];
  private using: string | null = null;
  private info!: Phaser.GameObjects.Text;
  private picture!: ItemPicture;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super('Bag');
  }

  init(data: MenuData): void {
    this.args = data;
    this.using = null;
  }

  create(): void {
    drawPanel(this, 'Bag', 'Enter: use   Esc: back', GAME_WIDTH, GAME_HEIGHT);
    this.items = new ListMenu(this, 24, 80, { width: 420, fontSize: 22, rowHeight: 38, visibleRows: 8 });
    this.targets = new ListMenu(this, 494, 120, { width: 440, fontSize: 19, rowHeight: 34, visibleRows: content.rules.teamSize });
    this.items.onChange = () => this.showInfo();
    this.items.onPick = (i) => this.pickItem(i);
    this.targets.onPick = (i) => this.useOn(i);
    this.info = this.add
      .text(494, 80, '', { fontFamily: FONT, fontSize: '18px', color: COLORS.text, wordWrap: { width: 360 } })
      .setDepth(30);
    this.picture = new ItemPicture(this, GAME_WIDTH - 60, 110, 64);
    this.message = this.add
      .text(30, GAME_HEIGHT - 60, '', { fontFamily: FONT, fontSize: '18px', color: COLORS.selected })
      .setDepth(30);
    bindMenuKeys(this, {
      up: () => (this.using ? this.targets : this.items).move(-1),
      down: () => (this.using ? this.targets : this.items).move(1),
      confirm: () => (this.using ? this.useOn(this.targets.index) : this.pickItem(this.items.index)),
      back: () => (this.using ? this.stopUsing() : backToMenu(this, this.args)),
    });
    this.refresh();
  }

  private refresh(): void {
    const g = getGame();
    this.itemIds = content.items.filter((it) => (g.bag[it.id] ?? 0) > 0).map((it) => it.id);
    const labels = this.itemIds.map((id) => `${content.items.find((it) => it.id === id)!.name}  x${g.bag[id]}`);
    this.items.focused = !this.using;
    this.items.setItems(labels.length ? labels : ['(nothing yet)']);
    this.showInfo();
  }

  private showInfo(): void {
    const it = content.items.find((x) => x.id === this.itemIds[this.items.index]);
    this.picture.show(this.using ? undefined : it?.id);
    if (this.using) {
      this.info.setText(`Who gets the ${content.items.find((x) => x.id === this.using)!.name}?`);
    } else {
      const how =
        it?.effect.kind === 'catch'
          ? 'Use it in a battle: pick Cage.'
          : it?.effect.kind === 'teleportPin'
            ? 'Place it on the map once a monster is level 50.'
            : it?.effect.kind === 'mapPart'
              ? 'Opens a gate.'
              : 'Press Enter to use it.';
      this.info.setText(it ? `${it.description}\n${how}` : '');
    }
    this.report();
  }

  private pickItem(i: number): void {
    const id = this.itemIds[i];
    const it = content.items.find((x) => x.id === id);
    if (!it) return;
    if (it.effect.kind !== 'heal' && it.effect.kind !== 'revive') {
      this.say(it.effect.kind === 'catch' ? 'Cages are for battles. Pick Cage when a wild monster appears.' : "You can't use that here.");
      return;
    }
    const team = getGame().team;
    if (team.length === 0) {
      this.say('Catch a monster first!');
      return;
    }
    this.using = it.id;
    this.targets.setItems(team.map((m) => monsterLine(content, m)), false);
    this.targets.focused = true;
    this.items.focused = false;
    this.items.draw();
    this.targets.draw();
    this.say('');
    this.showInfo();
  }

  private useOn(i: number): void {
    const m = getGame().team[i];
    if (!m || !this.using) return;
    const problem = itemTargetProblem(content, this.using, m);
    if (problem) {
      this.say(problem);
      return;
    }
    const result = useHealingItem(content, getGame(), this.using, m.uid);
    if (!result.ok) {
      this.say(result.reason);
      return;
    }
    setGame(result.state);
    saveGame();
    const name = content.items.find((x) => x.id === this.using)!.name;
    this.stopUsing();
    this.say(`Used the ${name}!`);
  }

  private stopUsing(): void {
    this.using = null;
    this.targets.setItems([]);
    this.refresh();
  }

  private say(text: string): void {
    this.message.setText(text);
    this.report();
  }

  private report(): void {
    reportState({
      scene: 'Bag',
      using: this.using,
      menu: this.itemIds,
      selected: this.using ? this.targets.index : (this.itemIds[this.items.index] ?? null),
      message: this.message?.text ?? '',
      team: getGame().team.map((m) => ({ species: m.species, hp: m.hp })),
      bag: { ...getGame().bag },
    });
  }
}
