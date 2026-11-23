import * as Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { MAPS } from './data/maps';
import { BagScene } from './scenes/BagScene';
import { BattleScene } from './scenes/BattleScene';
import { BookScene } from './scenes/BookScene';
import { BootScene } from './scenes/Boot';
import { installEncounterFlow } from './scenes/encounterFlow';
import { EvolveScene } from './scenes/EvolveScene';
import { MapScene } from './scenes/MapScene';
import { MenuScene } from './scenes/MenuScene';
import { PapaiScene } from './scenes/PapaiScene';
import { ShopScene } from './scenes/ShopScene';
import { TeamScene } from './scenes/TeamScene';
import { TeleportScene } from './scenes/TeleportScene';
import { EndingScene } from './scenes/EndingScene';
import { PickBiomeScene } from './scenes/PickBiome';
import { TitleScene } from './scenes/Title';
import { installTestHook } from './testHook';
import { installSharpRendering, RENDER_SCALE } from './ui/display';

installTestHook(__APP_VERSION__);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // A bigger canvas, zoomed back to the 960x640 layout, so text and art stay sharp (src/ui/display.ts).
  width: GAME_WIDTH * RENDER_SCALE,
  height: GAME_HEIGHT * RENDER_SCALE,
  backgroundColor: COLORS.background,
  antialias: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, PickBiomeScene, ...MAPS.map((m) => new MapScene(m)), BattleScene, EvolveScene, MenuScene, TeamScene, BagScene, BookScene, ShopScene, PapaiScene, TeleportScene, EndingScene],
});

installSharpRendering(game);
installEncounterFlow(game);
