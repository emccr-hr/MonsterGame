import * as Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, STEP_MS, TILE_SIZE } from '../config';
import { content } from '../data';
import { ANSONVILLE, mapById, paletteAt, type GameMap } from '../data/maps';
import { debugLevelTeam, readyToEvolve } from '../logic/collection';
import { stepOnEncounterGround } from '../logic/encounterRate';
import { createRng, type Rng } from '../logic/rng';
import { arenaGate } from '../logic/ending';
import { gateProgress, useReviver } from '../logic/world';
import { currentGame, freshSeed, getGame, saveGame, setGame } from '../state/game';
import { getWorld, isBiomeOpen, markTipSeen, openAllBiomes, setPlayerPosition } from '../state/world';
import { reportState } from '../testHook';
import { playMusic } from '../ui/audio';
import { drawMapArt, drawPin, teleportSparkle } from '../ui/mapArt';
import { cameraScrollFor } from '../ui/displayMath';
import { addCharacter } from '../ui/sprites';
import { drawMonster } from '../ui/monsterArt';
import { canCrossWater, ridingMonster, stepMs } from '../logic/riding';
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
  /** Restarting in place (debug unlock), teleporting, or back from the ending. */
  at?: Tile;
  /** A message to show on arrival (teleporting, after the credits). */
  arrive?: string;
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
  private arrive?: string;
  /** Centered on the player's tile (the sprite inside stands on the tile's bottom edge). */
  private player!: Phaser.GameObjects.Container;
  /** The drawing inside `player`; it bobs and leans while walking. */
  private look!: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  private lookY = 0;
  /** The player's own height in the container; riding lifts the player onto the monster (Round 88). */
  private baseLookY = 0;
  private rider?: Phaser.GameObjects.Container;
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
    this.arrive = data.arrive;
    // Real time is the seed (or ?seed= in tests); the rules that matter take an Rng (ADR 0002).
    this.rng = createRng(freshSeed());

    const gate = data.from ? gateTile(this.map, data.from) : undefined;
    this.tile = data.at ?? (gate ? besideTile(this.map, gate) : startTile(this.map));
  }

  create(): void {
    this.drawMap();

    // The player's vector sprite (M8), or the old red dot if the file is missing.
    this.look = addCharacter(this, 'player-map', 0, T / 2 + 2, T * 1.25) ?? this.add.circle(0, 0, T * 0.38, 0xff5d73).setStrokeStyle(3, 0x1b1b1b);
    this.lookY = this.baseLookY = this.look.y;
    this.walkStep = 0;
    this.player = this.add.container(this.tile.x * T + T / 2, this.tile.y * T + T / 2, [this.look]).setDepth(5);
    this.drawRider();
    this.drawPenMonsters();
    const pool = this.wildPool();
    if (pool) this.walkers = this.makeWalkers(pool);

    // The camera follows the player inside the map (done by hand: see cameraScrollFor in src/ui/display.ts).
    this.followPlayer();

    this.drawHud();
    this.setupInput();
    const music = () => playMusic(this.map.biome ?? 'ansonville'); // M8: each area has its own song
    music();

    // Back from a battle, evolving or the menu (they pause this scene and resume it after).
    const onResume = () => {
      this.resumedAt = performance.now();
      this.drawRider(); // the Team screen may have started or stopped a ride
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
    if (this.arrive) {
      teleportSparkle(this, this.player.x, this.player.y);
      this.showMessage(this.arrive, 5000);
    } else if (markTipSeen(tip)) this.showMessage(tipText(tip), 5000);
    else this.menuTip();
  }

  /** Once you have a monster: tell about the M menu, once. */
  private menuTip(): void {
    if (getGame().team.length > 0 && markTipSeen('menu')) this.showMessage(tipText('menu'), 5000);
  }

  /** Keep the player in the middle of the view, without showing past the map's edges. */
  private followPlayer(): void {
    const cam = this.cameras.main;
    cam.scrollX = cameraScrollFor(this.player.x, GAME_WIDTH, width(this.map) * T);
    cam.scrollY = cameraScrollFor(this.player.y, GAME_HEIGHT, height(this.map) * T);
  }

  override update(): void {
    this.followPlayer();
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
  private openOverlay(key: 'Menu' | 'Shop' | 'Papai' | 'Pen'): void {
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
    if (wild) {
      this.walkers!.remove(wild.id);
      this.startEncounter(this.wildPool()!, wild.spawn);
      return;
    }
    // Riding a Big Beach monster swims across water (Round 88).
    const swim = kind === 'water' && canCrossWater(content, getGame());
    if (!isWalkable(kind) && !swim) {
      this.bump(next, kind, false);
      return;
    }
    this.moving = true;
    this.walkAnimation(dir);
    this.tweens.add({
      targets: this.player,
      x: next.x * T + T / 2,
      y: next.y * T + T / 2,
      duration: stepMs(content, getGame(), STEP_MS), // riding is faster (Round 88)
      onComplete: () => {
        this.tile = next;
        this.moving = false;
        setPlayerPosition(this.map.id, next);
        if (this.messageBox.visible) this.placeMessageBox();
        (this.children.getByName('area') as Phaser.GameObjects.Text | null)?.setText(this.areaName());
        this.afterStep(kind);
        this.report();
      },
    });
  }

  /**
   * One step of walking: a little hop with a lean to one side, then the other side on the next
   * step, so the player looks like he's stepping left foot, right foot. He faces the way he walks.
   */
/** Riding (Round 88): the ridden Big monster under the player, or nothing when walking. */
  private drawRider(): void {
    this.rider?.destroy();
    this.rider = undefined;
    const m = ridingMonster(getGame());
    this.lookY = m ? this.baseLookY - T * 0.55 : this.baseLookY;
    this.tweens.killTweensOf(this.look);
    this.look.setY(this.lookY).setAngle(0);
    if (!m) return;
    this.rider = drawMonster(this, m, 0, T * 0.45, T * 1.3);
    this.player.addAt(this.rider, 0);
  }

  /** Ansonville's pen (Round 89): the monsters in it wander around inside the fence. */
  private drawPenMonsters(): void {
    const area = this.map.pen;
    const pen = getGame().pen;
    if (!area || pen.length === 0) return;
    const spot = () => ({ x: (area.x + 0.7 + Math.random() * (area.w - 1.4)) * T, y: (area.y + 1 + Math.random() * (area.h - 1.8)) * T });
    for (const m of pen) {
      const at = spot();
      const look = drawMonster(this, m, at.x, at.y, T * 0.9).setDepth(4.5);
      const wander = () => {
        if (!look.active) return;
        const to = spot();
        look.setScale(to.x < look.x ? -1 : 1, 1);
        this.tweens.add({ targets: look, x: to.x, y: to.y, duration: 1400 + Math.random() * 1600, delay: 600 + Math.random() * 2400, ease: 'Sine.easeInOut', onComplete: wander });
      };
      wander();
    }
  }

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
      case 'pen':
        this.openOverlay('Pen');
        return;
      case 'arenaGate': {
        // M6b: the open gate starts Avatar's battle (rules in src/logic/ending.ts).
        const gate = arenaGate(content, getGame());
        if (gate.battle) this.startEncounter(this.map.id, undefined, true);
        else this.showMessage(gate.text);
        return;
      }
      default:
        if (pressed) this.hideMessage();
    }
  }

  private afterStep(kind: TileKind): void {
    const pool = this.wildPool();
    if (kind !== 'encounter' || !pool) return;
    // The rule is in src/logic (ADR 0002); the scene only supplies the Rng.
    // With visible monsters around, hidden surprises are rarer (Round 62: "some surprises").
    const step = stepOnEncounterGround(this.stepsSinceEncounter, this.rng, this.walkers ? SURPRISE_ENCOUNTER_RATE : undefined);
    this.stepsSinceEncounter = step.stepsSince;
    if (step.encounter) this.startEncounter(pool);
  }

  /** Where wild monsters here come from: the biome, or the map's mixed pool (Round 71), or none. */
  private wildPool(): string | null {
    return this.map.biome ?? this.map.wildPool ?? null;
  }

  /** Fire the encounter: M4's encounter flow pauses this scene and runs the battle on top. */
  private startEncounter(biomeId: string, spawn?: Spawn, boss = false): void {
    this.paused = true;
    this.queued = null;
    this.hideMessage();
    const event: WildEncounterEvent = { biomeId, sceneKey: this.scene.key, tile: { ...this.tile }, spawn, boss };
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
    // M8 sprites (and the arena, open or sealed); old shapes below where a file is missing.
    const art = drawMapArt(this, this.map, T, isBiomeOpen, this.map.id === ANSONVILLE.id && gateProgress(content, getGame()).open);
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
        // Ansonville's five biome areas (Round 80): ground, grass, walls and trees take the nearest gate's colors.
        const zp = this.map.zoned ? paletteAt(this.map, x, y) : p;
        const tileColors = zp === p ? colors : { ...colors, wall: zp.wall, ground: zp.ground, encounter: zp.encounter, blocker: zp.blocker, guide: zp.ground };
        let color = onSprite ? zp.ground : (tileColors[kind] ?? zp.ground);
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
    for (const t of findAll(this.map, 'P')) label(t, 'Pen', 11).setY(t.y * T + T + 6);
    // The town's name over its square (Round 90), centered above the Shop and Reviver.
    const shop = findAll(this.map, '$')[0];
    if (this.map.town && shop) label({ x: shop.x, y: shop.y - 2 }, this.map.town.name, 20).setX((shop.x + 1) * T);
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
    if (!art.arena) for (const t of findAll(this.map, 'A')) label(t, '🔒', 16);
    // Teleport Pins placed on this map (M6b).
    for (const pin of getGame().pins.filter((p) => p.scene === this.map.id)) drawPin(this, pin.x * T + T / 2, pin.y * T + T / 2);
  }

  /** The name top left: the town's name inside a biome's town (Round 90), else the map's. */
  private areaName(): string {
    const town = this.map.town;
    return town && this.tile.y < town.rows ? town.name : this.map.name;
  }

  private drawHud(): void {
    const area = this.add
      .text(12, 10, this.areaName(), {
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
    // How many wild monsters are caught, out of what Avatar's arena needs (designer, Round 77).
    const arena = g ? gateProgress(content, g) : undefined;
    const arenaText = !arena ? '' : arena.open ? '   Arena open!' : `   Arena: ${arena.caught}/${arena.needed}`;
    this.wallet?.setText(g ? `${g.gems} gems   ${g.bag.cage ?? 0} cages${arenaText}` : '');
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
