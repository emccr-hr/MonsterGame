import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateContent } from '../../src/data/validate';
import { newGame, type GameState } from '../../src/logic/game';
import { createMonster } from '../../src/logic/monster';
import { serialize } from '../../src/logic/save';

// M6b: teleporting from level 50, Avatar's battle from the open arena gate, the ending and credits,
// and back in Ansonville by the arena with `avatarBeaten` saved. The test loads a late-game save
// (every wild monster caught, a strong team) instead of playing for hours.
// Ansonville (src/data/maps): the arena gate A is at (17, 9); the tile above it is (17, 8).

interface Snap {
  scene: string;
  phase?: string;
  message?: string;
  menu?: string[];
  selected?: string | null;
  outcome?: string | null;
  tile?: { x: number; y: number };
  area?: string;
  boss?: boolean;
  enemy?: { species: string } | null;
  pins?: unknown[];
}

const SAVE_KEY = 'magic-and-monsters.save';
// Node can't import JSON without an import attribute here, so read the data files.
const data = (name: string): unknown => JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'src', 'data', `${name}.json`), 'utf8'));
const files = ['monsters', 'moves', 'abilities', 'biomes', 'items', 'rules', 'guide'] as const;
const content = validateContent(Object.fromEntries(files.map((f) => [f, data(f)])) as Parameters<typeof validateContent>[0]).content!;
const state = (page: Page) => page.evaluate(() => window.__TEST__!.state() as Snap);

function lateGame(): GameState {
  const wild = content.monsters.filter((m) => m.kind === 'monster' && m.spawnWeight !== null).map((m) => m.id);
  const team = ['scout', 'treetail', 'grandhoot', 'mossboulder', 'stormkite', 'rom'].map((id, i) => createMonster(content, id, 100, false, i + 1));
  return {
    ...newGame(content, 'forest', 7),
    team,
    nextUid: 10,
    caught: wild,
    seen: wild,
    openBiomes: content.biomes.map((b) => b.id),
    bag: { cage: 50, potion: 20, 'teleport-pin': 2 },
    area: 'ansonville',
    tile: { x: 17, y: 8 },
    seenTips: ['ansonville', 'menu', 'battle'],
  };
}

async function continueGame(page: Page, save: GameState) {
  await page.goto('./?test&seed=3');
  await page.evaluate(([k, v]) => window.localStorage.setItem(k!, v!), [SAVE_KEY, serialize(save)]);
  await page.reload();
  await page.waitForFunction(() => window.__TEST__?.ready === true, undefined, { timeout: 15_000 });
  await page.locator('canvas').click();
  await expect
    .poll(async () => {
      const s = await state(page);
      if (s.scene === 'Title' && s.selected !== 'Continue') await page.keyboard.press('ArrowDown');
      return s.selected ?? s.scene;
    })
    .toBe('Continue');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).scene).toBe('Ansonville');
}

/** Presses `key` until `done` holds (Phaser reads keys on its next frame). */
async function pressUntil(page: Page, key: string, done: (s: Snap) => boolean, timeout = 20_000) {
  await expect
    .poll(
      async () => {
        const s = await state(page);
        if (!done(s)) await page.keyboard.press(key);
        return done(s);
      },
      { timeout, intervals: [200] },
    )
    .toBe(true);
}

test('the open arena gate starts the Avatar battle, then the ending, then the game keeps going', async ({ page }) => {
  test.setTimeout(180_000);
  await continueGame(page, lateGame());
  await page.keyboard.press('ArrowDown'); // Walk into the arena gate.
  await expect.poll(async () => (await state(page)).scene).toBe('Battle');
  const start = await state(page);
  expect(start.boss).toBe(true);
  expect(start.enemy?.species).toBe('avatar');

  // Fight with the first move until it ends (Enter also skips text). The team can't run or cage.
  await expect
    .poll(
      async () => {
        const s = await state(page);
        if (s.scene === 'Battle' && s.phase === 'menu') expect(s.menu).not.toContain('Run');
        if (s.scene === 'Battle' && s.phase !== 'done') await page.keyboard.press('Enter');
        return s.scene;
      },
      { timeout: 150_000, intervals: [150] },
    )
    .toBe('Ending');

  await pressUntil(page, 'Enter', (s) => s.scene !== 'Ending', 60_000);
  const back = await state(page);
  expect(back.scene).toBe('Ansonville');
  expect(back.tile).toEqual({ x: 17, y: 8 });
  expect(back.message).toMatch(/keeps going/);
  const saved = await page.evaluate((k) => JSON.parse(window.localStorage.getItem(k) ?? '{}'), SAVE_KEY);
  expect(saved.state.avatarBeaten).toBe(true);
});

test('teleport menu: place a pin, teleport to a shop, then back to the pin', async ({ page }) => {
  await continueGame(page, lateGame());
  await page.keyboard.press('m');
  await expect.poll(async () => (await state(page)).scene).toBe('Menu');
  await pressUntil(page, 'ArrowDown', (s) => s.selected === 'Teleport');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).scene).toBe('Teleport');

  // Row 1 places a pin where the player stands.
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).pins?.length).toBe(1);
  expect((await state(page)).menu).toContain('Pin 1: Ansonville');

  await pressUntil(page, 'ArrowDown', (s) => s.selected === 'Volcano shop');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).scene).toBe('Volcano');
  expect((await state(page)).message).toMatch(/Poof/);

  await page.keyboard.press('m');
  await expect.poll(async () => (await state(page)).scene).toBe('Menu');
  await pressUntil(page, 'ArrowDown', (s) => s.selected === 'Teleport');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).scene).toBe('Teleport');
  await pressUntil(page, 'ArrowDown', (s) => s.selected === 'Pin 1: Ansonville');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).scene).toBe('Ansonville');
  expect((await state(page)).tile).toEqual({ x: 17, y: 8 });
});
