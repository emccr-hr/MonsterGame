import { expect, test, type Page } from '@playwright/test';

// The built game hides the test hook unless the address has `?test`.
async function openGame(page: Page) {
  await page.goto('./?test');
  await page.waitForFunction(() => window.__TEST__?.ready === true, undefined, { timeout: 15_000 });
}

const state = (page: Page) => page.evaluate(() => window.__TEST__!.state());

test('the game boots to the title screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await openGame(page);
  await expect(page).toHaveTitle('Magic and Monsters');
  await expect(page.locator('canvas')).toBeVisible();

  const s = await state(page);
  expect(s.scene).toBe('Title');
  expect(s.selected).toBe('New Game');
  expect(s.menu).toEqual([
    { label: 'New Game', enabled: true },
    { label: 'Continue', enabled: false },
  ]);
  expect(errors).toEqual([]);
});

test('New Game can be chosen with the keyboard', async ({ page }) => {
  await openGame(page);
  await page.locator('canvas').click(); // Focus the game.
  await page.keyboard.press('ArrowDown'); // Continue is off with no save, so the highlight stays put.
  expect((await state(page)).selected).toBe('New Game');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).scene).toBe('PickBiome');
});

test('the test hook is hidden from players', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => typeof window.__TEST__)).toBe('undefined');
});
