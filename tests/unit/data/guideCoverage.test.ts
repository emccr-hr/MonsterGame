// Papai must know the whole game (ADR 0008). This test reads the scene code and fails when a screen,
// a key or an item has no guide topic that covers it, so a new feature can't ship without one.
// Fix a failure by adding or extending a topic in src/data/guide.json (`covers`), not by editing this list.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { realContent } from '../helpers';

const content = realContent();
const root = join(__dirname, '..', '..', '..', 'src');

/** Keys that only work in dev builds (MapScene: U opens every gate, L levels the team). */
const DEV_ONLY_KEYS = new Set(['U', 'L']);
/** Screens a player never stops on. */
const NOT_PLAYER_SCREENS = new Set(['Boot']);

const read = (dir: string) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(join(root, dir, f), 'utf8'));

const scenes = read('scenes');
const ui = read('ui');

function found(sources: string[], pattern: RegExp): string[] {
  return sources.flatMap((src) => [...src.matchAll(pattern)].map((m) => m[1]!));
}

const screens = new Set(found(scenes, /super\('([A-Za-z]+)'\)/g).filter((s) => !NOT_PLAYER_SCREENS.has(s)));
const keys = new Set(
  [
    ...found(scenes, /keydown-([A-Z]+)/g),
    ...found(scenes, /onKey\(this, '([A-Z]+)'/g),
    // bindMenuKeys in src/ui/listMenu.ts: on(['UP', 'W'], ...)
    ...found(ui, /on\(\[([^\]]+)\]/g).flatMap((list) => [...list.matchAll(/'([A-Z]+)'/g)].map((m) => m[1]!)),
  ].filter((k) => !DEV_ONLY_KEYS.has(k)),
);
const covered = new Set(content.guide.topics.flatMap((t) => t.covers));

describe('Papai knows every screen, key and item', () => {
  it('finds the screens and keys in the code (sanity check for the patterns above)', () => {
    expect(screens.has('Battle')).toBe(true);
    expect(screens.has('Menu')).toBe(true);
    expect(keys.has('M')).toBe(true);
    expect(keys.has('ENTER')).toBe(true);
  });

  it.each([...screens])('screen %s has a guide topic', (s) => {
    expect(covered.has(`scene:${s}`), `Add "scene:${s}" to a topic's covers in guide.json`).toBe(true);
  });

  it.each([...keys])('key %s has a guide topic', (k) => {
    expect(covered.has(`key:${k}`), `Add "key:${k}" to a topic's covers in guide.json`).toBe(true);
  });

  it.each(content.items.map((i) => i.id))('item %s has a guide topic', (id) => {
    expect(covered.has(`item:${id}`), `Add "item:${id}" to a topic's covers in guide.json`).toBe(true);
  });

  it('every first-time tip shown by a scene exists in guide.json', () => {
    const shown = new Set([...found(scenes, /markTipSeen\('([a-z-]+)'\)/g), ...found(scenes, /tipText\('([a-z-]+)'\)/g)]);
    const tips = new Set(content.guide.tips.map((t) => t.id));
    for (const id of shown) expect(tips.has(id), `guide.json has no tip "${id}"`).toBe(true);
  });
});
