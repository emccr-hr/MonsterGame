import { expect, test, type Page } from '@playwright/test';

// M4 catching and battles: New Game → Snowy → first catch (only "Throw cage") → win a battle →
// reload and Continue. `?seed=` makes the dice repeat, so the run is the same every time.
// Snowy layout (src/data/maps, 56x35 since Round 90, with the town on top): biome start (28,32); encounter ground at (24,31) and (24,30).

interface Snap {
  scene: string;
  selected?: string | null;
  tile?: { x: number; y: number };
  phase?: string;
  menu?: string[];
  outcome?: string | null;
  team?: { species: string; level: number; hp: number }[] | number;
  gems?: number;
  cages?: number;
}

const SEED = 7;
const state = (page: Page) => page.evaluate(() => window.__TEST__!.state() as Snap);
const teamOf = async (page: Page) => {
  const t = (await state(page)).team;
  return Array.isArray(t) ? t : [];
};

async function boot(page: Page) {
  await page.goto(`./?test&seed=${SEED}`);
  await page.waitForFunction(() => window.__TEST__?.ready === true, undefined, { timeout: 15_000 });
  await page.locator('canvas').click(); // Focus the game.
}

async function newGameInSnowy(page: Page) {
  await boot(page);
  await page.keyboard.press('Enter'); // New Game
  await expect.poll(async () => (await state(page)).scene).toBe('PickBiome');
  await expect
    .poll(
      async () => {
        const selected = (await state(page)).selected;
        if (selected !== 'snowy') await page.keyboard.press('ArrowDown');
        return selected;
      },
      { intervals: [150] },
    )
    .toBe('snowy');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).scene).toBe('Ansonville');
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await state(page)).scene, { timeout: 10_000 }).toBe('Snowy');
  await page.keyboard.up('ArrowUp');
}

/** One step; resolves when the tile changed or a battle started. */
async function step(page: Page, key: string) {
  const before = await state(page);
  await page.keyboard.press(key);
  await expect
    .poll(async () => {
      const s = await state(page);
      return s.scene === 'Battle' || JSON.stringify(s.tile) !== JSON.stringify(before.tile);
    })
    .toBe(true);
}

/** From the biome start, walk onto the snow and pace up and down until a wild monster appears. */
async function findWildMonster(page: Page) {
  const s = await state(page);
  if (s.tile && s.tile.y === 32) {
    for (let i = 0; i < 4; i++) await step(page, 'ArrowLeft');
    await step(page, 'ArrowUp');
  }
  for (let i = 0; i < 80 && (await state(page)).scene !== 'Battle'; i++) {
    await step(page, (await state(page)).tile!.y === 31 ? 'ArrowUp' : 'ArrowDown');
  }
  await expect.poll(async () => (await state(page)).scene).toBe('Battle');
}

/** Presses Enter (first choice or next line) until the battle is over. Returns how it ended. */
async function mashUntilOver(page: Page, check?: (s: Snap) => void): Promise<string> {
  let outcome = '';
  for (let i = 0; i < 400; i++) {
    const s = await state(page);
    if (s.scene !== 'Battle') return outcome;
    if (s.outcome) outcome = s.outcome;
    check?.(s);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(60);
  }
  throw new Error('The battle never ended');
}

test('first catch, then win a battle, then Continue after a reload', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await newGameInSnowy(page);
  expect(await teamOf(page)).toEqual([]);

  // First catch: the only choice is "Throw cage". Keep trying until one is caught.
  for (let tries = 0; tries < 6 && (await teamOf(page)).length === 0; tries++) {
    await findWildMonster(page);
    await mashUntilOver(page, (s) => {
      if (s.phase === 'menu') expect(s.menu).toEqual(['Throw cage']);
    });
    await expect.poll(async () => (await state(page)).scene).toBe('Snowy');
  }
  const team = await teamOf(page);
  expect(team).toHaveLength(1);
  expect((await state(page)).cages).toBeLessThan(100);

  // Battle: Fight with the first move until it's over. A win gives XP and gems.
  let won = false;
  for (let tries = 0; tries < 6 && !won; tries++) {
    await findWildMonster(page);
    const outcome = await mashUntilOver(page);
    await expect.poll(async () => (await state(page)).scene).toBe('Snowy');
    won = outcome === 'won';
  }
  expect(won).toBe(true);
  expect((await state(page)).gems).toBeGreaterThan(100);

  // M5: the M menu opens Team and the Monster Book; Esc goes back, then back to the map.
  // Menu screens ignore keys for a moment after opening (the key that opened them), so wait a beat.
  const sceneIs = async (name: string) => {
    await expect.poll(async () => (await state(page)).scene).toBe(name);
    await page.waitForTimeout(250);
  };
  await page.waitForTimeout(250);
  await page.keyboard.press('m');
  await sceneIs('Menu');
  await page.keyboard.press('Enter');
  await sceneIs('Team');
  expect(((await state(page)) as unknown as { team: unknown[] }).team.length).toBe(team.length);
  await page.keyboard.press('Escape');
  await sceneIs('Menu');
  // Headless Phaser can drop a quick key press, so press Down until the Book is picked.
  await expect
    .poll(
      async () => {
        const selected = (await state(page)).selected;
        if (selected !== 'Monster Book') await page.keyboard.press('ArrowDown');
        return selected;
      },
      { intervals: [200] },
    )
    .toBe('Monster Book');
  await page.keyboard.press('Enter');
  await sceneIs('Book');
  const book = (await state(page)) as unknown as { summary: { caught: number; gate: { caught: number } } };
  expect(book.summary.caught).toBeGreaterThanOrEqual(1);
  expect(book.summary.gate.caught).toBeGreaterThanOrEqual(1);
  await page.keyboard.press('Escape');
  await sceneIs('Menu');
  await page.keyboard.press('Escape');
  await sceneIs('Snowy');

  // The game saved: reload, Continue, and the monster is still on the team.
  await boot(page);
  const title = await state(page);
  expect(title.menu as unknown).toContainEqual({ label: 'Continue', enabled: true });
  // Headless Phaser can drop a quick key press right after the title appears, so press Down until
  // Continue is picked (the same pattern as the Monster Book step above).
  await expect
    .poll(
      async () => {
        const selected = (await state(page)).selected;
        if (selected !== 'Continue') await page.keyboard.press('ArrowDown');
        return selected;
      },
      { intervals: [200] },
    )
    .toBe('Continue');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).scene).toBe('Snowy');
  expect((await teamOf(page)).length).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});
