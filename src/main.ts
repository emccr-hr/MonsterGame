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
import { PickBiomeScene } from './scenes/PickBiome';
import { TitleScene } from './scenes/Title';
import { installTestHook } from './testHook';

installTestHook(__APP_VERSION__);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, PickBiomeScene, ...MAPS.map((m) => new MapScene(m)), BattleScene, EvolveScene, MenuScene, TeamScene, BagScene, BookScene, ShopScene, PapaiScene],
});

installEncounterFlow(game);
