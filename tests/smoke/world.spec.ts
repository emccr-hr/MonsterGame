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
  expect(s.message).toBe('Desert is locked. Map part needed!');
});
