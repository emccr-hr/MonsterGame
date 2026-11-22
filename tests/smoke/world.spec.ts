import { expect, test, type Page } from '@playwright/test';

// M3 world: New Game → pick a biome → walk Ansonville → enter the biome and come back.
// Maps: src/data/maps. The Snowy gate is straight up from the Ansonville start (a unit test pins that).

interface WorldSnapshot {
  scene: string;
  selected?: string;
  tile?: { x: number; y: number };
  openBiomes?: string[];
  message?: string;
}

const state = (page: Page) => page.evaluate(() => window.__TEST__!.state() as WorldSnapshot);

async function newGame(page: Page, biome: string) {
  await page.goto('./?test');
  await page.waitForFunction(() => window.__TEST__?.ready === true, undefined, { timeout: 15_000 });
  await page.locator('canvas').click(); // Focus the game.
  await page.keyboard.press('Enter'); // New Game
  await expect.poll(async () => (await state(page)).scene).toBe('PickBiome');
  // Phaser handles keys on its next frame, so wait for each press to land before the next one.
  await expect
    .poll(
      async () => {
        const selected = (await state(page)).selected;
        if (selected !== biome) await page.keyboard.press('ArrowDown');
        return selected;
      },
      { intervals: [150] },
    )
    .toBe(biome);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).scene).toBe('Ansonville');
}

/** Holds a key until the game reaches `done`, then lets go. */
async function walkUntil(page: Page, key: string, done: (s: WorldSnapshot) => boolean) {
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => done(await state(page)), { timeout: 10_000 }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
}

/** Taps a key `n` times, one tile per tap. */
async function steps(page: Page, key: string, n: number) {
  for (let i = 0; i < n; i++) {
    const before = (await state(page)).tile;
    await page.keyboard.press(key);
    await expect.poll(async () => (await state(page)).tile).not.toEqual(before);
  }
}

test('new game: pick Snowy, walk into it and back to Ansonville', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await newGame(page, 'snowy');
  const town = await state(page);
  expect(town.openBiomes).toEqual(['snowy']);
  const start = town.tile!;

  await walkUntil(page, 'ArrowUp', (s) => s.scene === 'Snowy');
  // Back out through the exit, two steps down from the biome start.
  await walkUntil(page, 's', (s) => s.scene === 'Ansonville');
  const back = await state(page);
  expect(back.tile!.x).toBe(start.x); // Beside the Snowy gate.
  expect(back.tile!.y).toBeLessThan(start.y);
  expect(errors).toEqual([]);
});

test('a locked gate says a map part is needed', async ({ page }) => {
  await newGame(page, 'forest');
  await page.keyboard.press('Escape'); // Close the welcome tip.
  // The Desert gate is on the west wall, on the row 4 tiles above the start.
  await steps(page, 'ArrowUp', 4);
  await walkUntil(page, 'ArrowLeft', (s) => (s.message ?? '').includes('Map part needed'));
  const s = await state(page);
  expect(s.scene).toBe('Ansonville');
  expect(s.message).toBe('Desert is locked. Map part needed! Buy one at the shop.');
});

test('M6: buy a map part at the shop, and the Desert gate opens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await newGame(page, 'forest');
  await page.keyboard.press('Escape'); // Close the welcome tip.
  // The shop is 8 tiles left of the start and one row up: stand below it and face up.
  await steps(page, 'ArrowLeft', 8);
  await expect.poll(async () => (await state(page)).tile).toEqual({ x: 9, y: 7 });
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await state(page)).scene).toBe('Shop');
  await page.waitForTimeout(250); // Screens ignore keys for a moment after opening.

  const shop = () => state(page) as Promise<WorldSnapshot & { gems: number; confirming: boolean; openBiomes: string[] }>;
  await expect
    .poll(
      async () => {
        const selected = (await state(page)).selected;
        if (selected !== 'Map Part: Desert') await page.keyboard.press('ArrowDown');
        return selected;
      },
      { intervals: [200] },
    )
    .toBe('Map Part: Desert');
  await expect
    .poll(
      async () => {
        if (!(await shop()).confirming) await page.keyboard.press('Enter');
        return (await shop()).confirming;
      },
      { intervals: [200] },
    )
    .toBe(true);
  await page.keyboard.press('Enter'); // Yes, buy it.
  await expect.poll(async () => (await shop()).openBiomes).toEqual(['forest', 'desert']);
  expect((await shop()).gems).toBe(50);

  await page.keyboard.press('Escape'); // Leave the shop; the map redraws with the gate open.
  await expect.poll(async () => (await state(page)).scene).toBe('Ansonville');
  await page.waitForTimeout(250);
  // The Desert gate is on the west wall, 4 rows above the start row (step past the shop first).
  await steps(page, 'ArrowRight', 2);
  await steps(page, 'ArrowUp', 4);
  await walkUntil(page, 'ArrowLeft', (s) => s.scene === 'Desert');
  expect(errors).toEqual([]);
});

test('Papai answers "What should I do next?" from the game state', async ({ page }) => {
  await newGame(page, 'beach');
  await page.keyboard.press('Escape'); // Close the welcome tip.
  // Papai stands 7 tiles right of the start, one row up.
  await steps(page, 'ArrowRight', 7);
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await state(page)).scene).toBe('Papai');
  expect((await state(page)).message).toMatch(/^Catch your first monster/);
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).scene).toBe('Ansonville');
});

test('save to a file from the menu, then load it in an empty browser', async ({ page }) => {
  await newGame(page, 'volcano');
  await page.keyboard.press('Escape'); // Close the welcome tip.
  await page.waitForTimeout(250);
  await page.keyboard.press('m');
  await expect.poll(async () => (await state(page)).scene).toBe('Menu');
  await page.waitForTimeout(250);
  await expect
    .poll(
      async () => {
        const selected = (await state(page)).selected;
        if (selected !== 'Save to file') await page.keyboard.press('ArrowDown');
        return selected;
      },
      { intervals: [200] },
    )
    .toBe('Save to file');
  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
  expect(download.suggestedFilename()).toMatch(/^magic-and-monsters-save-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();

  // A browser with no save: Continue is off, but the file brings the game back.
  await page.evaluate(() => localStorage.clear());
  await page.goto('./?test');
  await page.waitForFunction(() => window.__TEST__?.ready === true, undefined, { timeout: 15_000 });
  await page.locator('canvas').click();
  await expect
    .poll(
      async () => {
        const selected = (await state(page)).selected;
        if (selected !== 'Load save file') await page.keyboard.press('ArrowDown');
        return selected;
      },
      { intervals: [200] },
    )
    .toBe('Load save file');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')]);
  await chooser.setFiles(file);
  await expect.poll(async () => (await state(page)).scene).toBe('Ansonville');
  expect((await state(page)).openBiomes).toEqual(['volcano']);
});
