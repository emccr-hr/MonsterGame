import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, STEP_MS, TILE_SIZE } from '../config';
import { content } from '../data';
import { ANSONVILLE, mapById, type GameMap } from '../data/maps';
import { debugLevelTeam, readyToEvolve } from '../logic/collection';
import { stepOnEncounterGround } from '../logic/encounterRate';
import { createRng, type Rng } from '../logic/rng';
import { gateProgress, useReviver } from '../logic/world';
import { currentGame, freshSeed, getGame, saveGame, setGame } from '../state/game';
import { getWorld, isBiomeOpen, markTipSeen, openAllBiomes, setPlayerPosition } from '../state/world';
import { reportState } from '../testHook';
import { playMusic } from '../ui/audio';
import { drawMapArt } from '../ui/mapArt';
import { addCharacter } from '../ui/sprites';
import { WildWalkers } from '../ui/wildWalkers';
import { SURPRISE_ENCOUNTER_RATE } from '../logic/wildWalkers';
import type { Spawn } from '../logic/spawning';
import {
  add,
  besideTile,
  charAt,
  findAll,
  gateBiome,
  gateTile,
  height,
  isWalkable,
  kindAt,
  kindOf,
  startTile,
  width,
  type Dir,
  type Tile,
  type TileKind,
} from '../world/grid';
import { WILD_ENCOUNTER, type WildEncounterEvent } from './events';
import type { EvolveData } from './EvolveScene';
import type { MenuData } from './MenuScene';

interface MapSceneData {
  /** Arriving in Ansonville from this biome: stand beside its gate. */
  from?: string;
  /** Restarting in place (debug unlock). */
  at?: Tile;
}

const T = TILE_SIZE;
const MESSAGE_MS = 3000;

const tipText = (id: string): string => content.guide.tips.find((t) => t.id === id)?.text ?? '';

const biomeName = (id: string): string => content.biomes.find((b) => b.id === id)?.name ?? id;

/**
 * One walkable map: Ansonville or a biome. Each map gets its own scene, keyed by its name
 * ("Ansonville", "Forest", "Beach", "Desert", "Snowy", "Volcano"). Grid movement, one tile per step.
 */
export class MapScene extends Phaser.Scene {
  private readonly map: GameMap;
  private tile: Tile = { x: 0, y: 0 };
  private facing: Dir = 'down';
  private queued: Dir | null = null;
  private moving = false;
  private paused = false;
  /** Visible wild monsters on a biome map (Round 62). */
  private walkers?: WildWalkers;
  private leaving = false;
  private stepsSinceEncounter = 0;
  /** When the map last came back from a battle or menu; the key that closed it is ignored here. */
  private resumedAt = 0;
  private rng: Rng = createRng(1);
  /** Centered on the player's tile (the sprite inside stands on the tile's bottom edge). */
  private player!: Phaser.GameObjects.Container;
  /** The drawing inside `player`; it bobs and leans while walking. */
  private look!: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  private lookY = 0;
  private walkStep = 0;
  private messageBox!: Phaser.GameObjects.Container;
  private messageText!: Phaser.GameObjects.Text;
  private wallet!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor(map: GameMap) {
    super(map.name);
    this.map = map;
  }

  init(data: MapSceneData): void {
    this.facing = 'down';
    this.queued = null;
    this.moving = false;
    this.paused = false;
    this.leaving = false;
    this.stepsSinceEncounter = 0;
    this.messageTimer = undefined;
    // Real time is the seed (or ?seed= in tests); the rules that matter take an Rng (ADR 0002).
    this.rng = createRng(freshSeed());

    const gate = data.from ? gateTile(this.map, data.from) : undefined;
    this.tile = data.at ?? (gate ? besideTile(this.map, gate) : startTile(this.map));
  }

  create(): void {
    this.drawMap();

    // The player's vector sprite (M8), or the old red dot if the file is missing.
    this.look = addCharacter(this, 'player-map', 0, T / 2 + 2, T * 1.25) ?? this.add.circle(0, 0, T * 0.38, 0xff5d73).setStrokeStyle(3, 0x1b1b1b);
    this.lookY = this.look.y;
    this.walkStep = 0;
    this.player = this.add.container(this.tile.x * T + T / 2, this.tile.y * T + T / 2, [this.look]).setDepth(5);
    if (this.map.biome) this.walkers = this.makeWalkers(this.map.biome);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width(this.map) * T, height(this.map) * T);
    cam.startFollow(this.player, true);

    this.drawHud();
    this.setupInput();
    const music = () => playMusic(this.map.biome ?? 'ansonville'); // M8: each area has its own song
    music();

    // Back from a battle, evolving or the menu (they pause this scene and resume it after).
    const onResume = () => {
      this.resumedAt = performance.now();
      music();
      this.paused = false;
      this.queued = null;
      this.moving = false;
      setPlayerPosition(this.map.id, this.tile);
      this.report();
      this.menuTip();
    };
    this.events.on('resume', onResume);
    this.events.once('shutdown', () => this.events.off('resume', onResume));

    setPlayerPosition(this.map.id, this.tile);
    saveGame();
    this.report();

    // First visit: show this screen's guide tip once.
    const tip = this.map.biome ? 'biome' : 'ansonville';
    if (markTipSeen(tip)) this.showMessage(tipText(tip), 5000);
    else this.menuTip();
  }

  /** Once you have a monster: tell about the M menu, once. */
  private menuTip(): void {
    if (getGame().team.length > 0 && markTipSeen('menu')) this.showMessage(tipText('menu'), 5000);
  }

  override update(): void {
    if (this.moving || this.paused || this.leaving) return;
    const dir = this.queued ?? this.heldDir();
    this.queued = null;
    if (dir) this.tryStep(dir);
  }

  // ---- Input -----------------------------------------------------------------------------------

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

    // A quick tap queues one step, so short key presses never get lost between frames. Auto-repeat
    // events are ignored: holding a key is handled by heldDir(), and a queued repeat would add an
    // extra step after the key is let go.
    const tap = (dir: Dir) => (e: KeyboardEvent) => {
      if (!e.repeat && !this.paused && !this.leaving) this.queued = dir;
    };
    const once = (fn: () => void) => (e: KeyboardEvent) => {
      if (!e.repeat) fn();
    };
    kb.on('keydown-UP', tap('up'));
    kb.on('keydown-W', tap('up'));
    kb.on('keydown-DOWN', tap('down'));
    kb.on('keydown-S', tap('down'));
    kb.on('keydown-LEFT', tap('left'));
    kb.on('keydown-A', tap('left'));
    kb.on('keydown-RIGHT', tap('right'));
    kb.on('keydown-D', tap('right'));
    kb.on('keydown-SPACE', once(() => this.interact()));
    kb.on('keydown-ENTER', once(() => this.interact()));
    kb.on('keydown-ESC', () => this.hideMessage());
    kb.on('keydown-M', once(() => this.openMenu()));

    if (import.meta.env.DEV) {
      // Debug only: U opens every gate (map parts and the shop arrive in M6).
      kb.on(
        'keydown-U',
        once(() => {
          openAllBiomes();
          this.scene.restart({ at: this.tile });
        }),
      );
      // Debug only: L levels the team up to its next evolve level, then evolves it.
      kb.on(
        'keydown-L',
        once(() => {
          if (this.paused || this.leaving || this.moving) return;
          setGame(debugLevelTeam(content, getGame()));
          const ready = readyToEvolve(content, getGame()).filter((m) => getGame().team.some((t) => t.uid === m.uid));
          saveGame();
          if (ready.length === 0) return;
          this.paused = true;
          this.scene.pause();
          this.scene.run('Evolve', { uids: ready.map((m) => m.uid), map: this.scene.key } satisfies EvolveData);
        }),
      );
    }
  }

  /** M: Team, Bag, Monster Book, Save (M5). The map waits underneath. */
  private openMenu(): void {
    this.openOverlay('Menu');
  }

  /** Pauses the map and opens a screen on top (menu, shop); it resumes the map when it closes. */
  private openOverlay(key: 'Menu' | 'Shop' | 'Papai'): void {
    if (this.paused || this.leaving || this.moving || this.justResumed()) return;
    this.paused = true;
    this.queued = null;
    this.hideMessage();
    this.scene.pause();
    this.scene.run(key, { map: this.scene.key } satisfies MenuData);
  }

  private justResumed(): boolean {
    return performance.now() - this.resumedAt < 150;
  }

  private heldDir(): Dir | null {
    const c = this.cursors;
    const w = this.wasd;
    if (c?.up.isDown || w?.W.isDown) return 'up';
    if (c?.down.isDown || w?.S.isDown) return 'down';
    if (c?.left.isDown || w?.A.isDown) return 'left';
    if (c?.right.isDown || w?.D.isDown) return 'right';
    return null;
  }

  /** Space or Enter: close the message, or use whatever the player is facing. */
  private interact(): void {
    if (this.paused || this.leaving || this.justResumed()) return;
    if (this.messageBox.visible) {
      this.hideMessage();
      return;
    }
    const ahead = add(this.tile, this.facing);
    this.bump(ahead, kindAt(this.map, ahead), true);
  }

  // ---- Moving ----------------------------------------------------------------------------------

  private tryStep(dir: Dir): void {
    this.facing = dir;
    const next = add(this.tile, dir);
    const kind = kindAt(this.map, next);
    // Walking into a visible wild monster battles exactly that one (Round 62).
    const wild = this.walkers?.at(next);
    if (wild && this.map.biome) {
      this.walkers!.remove(wild.id);
      this.startEncounter(this.map.biome, wild.spawn);
      return;
    }
    if (!isWalkable(kind)) {
      this.bump(next, kind, false);
      return;
    }
    this.moving = true;
    this.walkAnimation(dir);
    this.tweens.add({
      targets: this.player,
      x: next.x * T + T / 2,
      y: next.y * T + T / 2,
      duration: STEP_MS,
      onComplete: () => {
        this.tile = next;
        this.moving = false;
        setPlayerPosition(this.map.id, next);
        if (this.messageBox.visible) this.placeMessageBox();
        this.afterStep(kind);
        this.report();
      },
    });
  }

  /**
   * One step of walking: a little hop with a lean to one side, then the other side on the next
   * step, so the player looks like he's stepping left foot, right foot. He faces the way he walks.
   */
  private walkAnimation(dir: Dir): void {
    if (this.look instanceof Phaser.GameObjects.Image) {
      if (dir === 'left') this.look.setFlipX(true);
      else if (dir === 'right') this.look.setFlipX(false);
    }
    this.walkStep++;
    this.tweens.killTweensOf(this.look);
    this.look.setY(this.lookY).setAngle(0);
    this.tweens.add({
      targets: this.look,
      y: this.lookY - 3,
      angle: this.walkStep % 2 ? 7 : -7,
      duration: STEP_MS / 2,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  /** Walking into (or pressing Space at) something solid. */
  private bump(at: Tile, kind: TileKind, pressed: boolean): void {
    switch (kind) {
      case 'gate': {
        const biome = gateBiome(this.map, charAt(this.map, at));
        if (!biome) return;
        if (isBiomeOpen(biome)) this.goTo(mapById(biome).name, {});
        else this.showMessage(`${biomeName(biome)} is locked. Map part needed! Buy one at the shop.`);
        return;
      }
      case 'exit':
        if (this.map.biome) this.goTo(ANSONVILLE.name, { from: this.map.biome });
        return;
      case 'shop':
        this.openOverlay('Shop');
        return;
      case 'reviver': {
        // Free healing; losing a battle wakes you at the last Reviver you used.
        setGame(useReviver(content, getGame(), this.map.id));
        saveGame();
        const anyone = getGame().team.length > 0;
        this.showMessage(anyone ? 'Reviver: your monsters are all better!' : 'Reviver: it heals your monsters for free. Catch one first!');
        return;
      }
      case 'guide':
        this.openOverlay('Papai');
        return;
      case 'arenaGate': {
        const gate = gateProgress(content, getGame());
        this.showMessage(
          gate.open
            ? "You caught every wild monster! Avatar's battle is coming soon."
            : `Avatar's arena is locked. Monsters caught: ${gate.caught} / ${gate.needed}. Catch them all to open it!`,
        );
        return;
      }
      default:
        if (pressed) this.hideMessage();
    }
  }

  private afterStep(kind: TileKind): void {
    if (kind !== 'encounter' || !this.map.biome) return;
    // The rule is in src/logic (ADR 0002); the scene only supplies the Rng.
    // With visible monsters around, hidden surprises are rarer (Round 62: "some surprises").
    const step = stepOnEncounterGround(this.stepsSinceEncounter, this.rng, this.walkers ? SURPRISE_ENCOUNTER_RATE : undefined);
    this.stepsSinceEncounter = step.stepsSince;
    if (step.encounter) this.startEncounter(this.map.biome);
  }

  /** Fire the encounter: M4's encounter flow pauses this scene and runs the battle on top. */
  private startEncounter(biomeId: string, spawn?: Spawn): void {
    this.paused = true;
    this.queued = null;
    this.hideMessage();
    const event: WildEncounterEvent = { biomeId, sceneKey: this.scene.key, tile: { ...this.tile }, spawn };
    this.game.events.emit(WILD_ENCOUNTER, event);
  }

  /** Wild monsters wander on this map's encounter ground, never onto the tiles the player is on or walking into. */
  private makeWalkers(biome: string): WildWalkers {
    const ground: Tile[] = [];
    this.map.rows.forEach((row, y) => [...row].forEach((ch, x) => kindOf(ch) === 'encounter' && ground.push({ x, y })));
    const playerTiles = (): Tile[] => {
      const fx = (this.player.x - T / 2) / T;
      const fy = (this.player.y - T / 2) / T;
      const tiles = [{ x: Math.floor(fx), y: Math.floor(fy) }, { x: Math.ceil(fx), y: Math.ceil(fy) }, { ...this.tile }];
      return tiles;
    };
    return new WildWalkers(this, { biome, tileSize: T, ground, playerTiles, teamLevels: () => getGame().team.map((m) => m.level), rng: this.rng });
  }

  private goTo(sceneKey: string, data: MapSceneData): void {
    this.leaving = true;
    this.scene.start(sceneKey, data);
  }

  // ---- Drawing ---------------------------------------------------------------------------------

  private drawMap(): void {
    const p = this.map.palette;
    const g = this.add.graphics();
    const art = drawMapArt(this, this.map, T, isBiomeOpen); // M8 sprites; old shapes below where a file is missing
    const label = (t: Tile, text: string, size = 12) =>
      this.add
        .text(t.x * T + T / 2, t.y * T + T / 2, text, {
          fontFamily: FONT,
          fontSize: `${size}px`,
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(4);
    const darker = (c: number) => Phaser.Display.Color.IntegerToColor(c).darken(18).color;

    const colors: Partial<Record<TileKind, number>> = {
      wall: p.wall,
      ground: p.ground,
      path: p.path,
      encounter: p.encounter,
      blocker: p.blocker,
      water: p.water,
      shop: 0x3d7ad6,
      reviver: 0xe05a7a,
      guide: p.ground,
      arena: 0x6b5b95,
      arenaGate: 0x3c2f66,
      exit: p.path,
    };

    this.map.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const kind = kindOf(row[x] ?? '#') ?? 'wall';
        // Under M8 tree and building sprites the ground shows, not the old placeholder color.
        const onSprite = (kind === 'blocker' && art.trees) || ((kind === 'shop' || kind === 'reviver') && art.buildings);
        let color = onSprite ? p.ground : (colors[kind] ?? p.ground);
        if (kind === 'gate') {
          const biome = gateBiome(this.map, row[x] ?? '');
          color = biome && isBiomeOpen(biome) ? 0xffd166 : 0x6c6a80;
        }
        g.fillStyle(color).fillRect(x * T, y * T, T, T);
        if (kind === 'encounter') {
          // Little tufts, so encounter ground doesn't rely on color alone.
          g.fillStyle(darker(color));
          g.fillRect(x * T + 6, y * T + 10, 3, 9).fillRect(x * T + 14, y * T + 6, 3, 9).fillRect(x * T + 22, y * T + 12, 3, 9);
        } else if (kind === 'blocker' && !art.trees) {
          g.fillStyle(darker(color)).fillCircle(x * T + T / 2, y * T + T / 2, T * 0.36);
        }
      }
    });

    const under = (t: Tile, text: string) => (art.buildings ? label(t, text, 11).setY(t.y * T + T + 6) : label(t, text));
    for (const t of findAll(this.map, '$')) under(t, 'Shop');
    for (const t of findAll(this.map, 'R')) under(t, 'Heal');
    for (const t of findAll(this.map, 'G')) {
      // Papai stands on his spot (M8 sprite) with a "?" above him; the old yellow dot if the file is missing.
      const papai = addCharacter(this, 'papai-map', t.x * T + T / 2, t.y * T + T + 2, T * 1.25);
      if (papai) {
        papai.setDepth(4);
        label(add(t, 'up'), '?', 18).setY(t.y * T - 8);
      } else {
        g.fillStyle(0xf2b134).fillCircle(t.x * T + T / 2, t.y * T + T / 2, T * 0.4);
        label(t, '?', 18);
      }
    }
    for (const t of findAll(this.map, 'E')) label(add(t, 'up'), 'To Ansonville');

    for (const [ch, biome] of Object.entries(this.map.gates ?? {})) {
      const gate = findAll(this.map, ch)[0];
      if (!gate) continue;
      const open = isBiomeOpen(biome);
      if (!art.gates) label(gate, open ? 'Go' : '🔒', open ? 12 : 16);
      const sign = label(besideTile(this.map, gate), open ? biomeName(biome) : `${biomeName(biome)}\nMap part needed`, 11);
      // Gates on the side walls: grow the sign inward so it isn't cut off at the map edge.
      if (gate.x === 0) sign.setOrigin(0, 0.5).setX(sign.x - T / 2);
      else if (gate.x === width(this.map) - 1) sign.setOrigin(1, 0.5).setX(sign.x + T / 2);
    }

    const arena = findAll(this.map, 'a');
    if (arena.length) {
      const xs = arena.map((t) => t.x);
      const ys = arena.map((t) => t.y);
      const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
      label(center, "Avatar's\nArena", 16);
    }
    for (const t of findAll(this.map, 'A')) label(t, '🔒', 16);
  }

  private drawHud(): void {
    const area = this.add
      .text(12, 10, this.map.name, {
        fontFamily: FONT,
        fontSize: '24px',
        color: COLORS.text,
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(20);
    area.setName('area');
    this.add
      .text(GAME_WIDTH - 12, 10, 'M: Menu', { fontFamily: FONT, fontSize: '18px', color: COLORS.text, backgroundColor: '#000000aa', padding: { x: 8, y: 4 } })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.openMenu());
    // Top right, left of the menu button: Magic Gems and cages (UI-and-HUD.md).
    this.wallet = this.add
      .text(GAME_WIDTH - 120, 10, '', { fontFamily: FONT, fontSize: '18px', color: COLORS.title, backgroundColor: '#000000aa', padding: { x: 8, y: 4 } })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20);

    const boxW = GAME_WIDTH - 40;
    const bg = this.add.rectangle(0, 0, boxW, 70, 0x14112b, 0.92).setStrokeStyle(3, 0xffd166).setOrigin(0);
    this.messageText = this.add.text(16, 12, '', {
      fontFamily: FONT,
      fontSize: '20px',
      color: COLORS.text,
      wordWrap: { width: boxW - 32 },
    });
    this.messageBox = this.add
      .container(20, GAME_HEIGHT - 90, [bg, this.messageText])
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);
  }

  private showMessage(text: string, ms = MESSAGE_MS): void {
    if (!text) return;
    // Already showing (e.g. holding a key against the shop): leave the box and its timer alone.
    if (this.messageBox.visible && this.messageText.text === text) return;
    this.messageTimer?.remove();
    this.messageText.setText(text);
    this.placeMessageBox();
    this.messageBox.setVisible(true);
    this.messageTimer = this.time.delayedCall(ms, () => this.hideMessage());
    this.report();
  }

  /** Keep the player in sight: near the bottom of the screen, the box goes to the top instead. */
  private placeMessageBox(): void {
    const playerScreenY = this.player.y - this.cameras.main.scrollY;
    this.messageBox.setY(playerScreenY > GAME_HEIGHT - 130 ? 56 : GAME_HEIGHT - 90);
  }

  private hideMessage(): void {
    this.messageTimer?.remove();
    this.messageTimer = undefined;
    if (!this.messageBox.visible) return;
    this.messageBox.setVisible(false);
    this.report();
  }

  private report(): void {
    const g = currentGame();
    this.wallet?.setText(g ? `${g.gems} gems   ${g.bag.cage ?? 0} cages` : '');
    reportState({
      scene: this.scene.key,
      area: this.map.id,
      biome: this.map.biome,
      tile: { ...this.tile },
      facing: this.facing,
      openBiomes: getWorld().openBiomes,
      message: this.messageBox?.visible ? this.messageText.text : '',
      team: currentGame()?.team.map((m) => ({ species: m.species, level: m.level, hp: m.hp })) ?? [],
      gems: currentGame()?.gems ?? 0,
      cages: currentGame()?.bag.cage ?? 0,
      wild: this.walkers?.list() ?? [],
    });
  }
}
