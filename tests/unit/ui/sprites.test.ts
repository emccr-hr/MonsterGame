// Vector sprites (M8): the file-name rules in spriteManifest.ts, and a check of the real files in
// src/assets/sprites/ (every file is safe to rasterize and names a real monster; the 15 base
// monsters, the player and Papai have sprites; anything else falls back to its look data).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildManifest,
  characterKey,
  fitBox,
  idFromPath,
  monsterKey,
  rasterScale,
  spriteKey,
  SPRITE_TIERS,
  svgDataUrl,
  svgProblems,
  tierFor,
  viewBoxSize,
} from '../../../src/ui/spriteManifest';
import { realContent } from '../helpers';

const content = realContent();
const DIR = join(__dirname, '../../../src/assets/sprites');
const readDir = (sub: string): Record<string, string> =>
  Object.fromEntries(
    readdirSync(join(DIR, sub))
      .filter((f) => f.endsWith('.svg'))
      .map((f) => [`../assets/sprites/${sub}/${f}`, readFileSync(join(DIR, sub, f), 'utf8')]),
  );
const monsterFiles = readDir('monsters');
const characterFiles = readDir('characters');
const monsters = buildManifest(monsterFiles, () => 'url');
const characters = buildManifest(characterFiles, () => 'url');

const GOOD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160"><circle r="4" fill="url(#g)"/></svg>';

describe('sprite manifest rules', () => {
  it('takes the id from the file name', () => {
    expect(idFromPath('../assets/sprites/monsters/anti-ant.svg')).toBe('anti-ant');
    expect(idFromPath('peggy.SVG')).toBe('peggy');
  });

  it('reads the viewBox size, and rejects a missing or broken one', () => {
    expect(viewBoxSize(GOOD)).toEqual({ width: 120, height: 160 });
    expect(viewBoxSize('<svg viewBox="0,0,32,40">')).toEqual({ width: 32, height: 40 });
    expect(viewBoxSize('<svg width="10">')).toBeUndefined();
    expect(viewBoxSize('<svg viewBox="0 0 0 10">')).toBeUndefined();
    expect(viewBoxSize('<svg viewBox="0 0 ten 10">')).toBeUndefined();
  });

  it('finds problems that would stop an SVG from showing safely', () => {
    expect(svgProblems(GOOD)).toEqual([]);
    expect(svgProblems('<svg viewBox="0 0 1 1"></svg>')).toContain('needs xmlns="http://www.w3.org/2000/svg"');
    expect(svgProblems(GOOD.replace('<circle', '<script>x()</script><circle'))).toContain('no <script>');
    expect(svgProblems(GOOD.replace('<circle', '<image href="a.png"/><circle'))).toContain('no embedded images');
    expect(svgProblems(GOOD.replace('url(#g)', 'url(other.svg#g)'))).toContain('no links to other files');
    expect(svgProblems(`<?xml version="1.0"?>${GOOD}`)).toContain('must start with <svg>');
  });

  it('builds sources by id and skips files without a viewBox', () => {
    const m = buildManifest({ 'a/dumble.svg': GOOD, 'a/bad.svg': '<svg></svg>' }, (s) => `u${s.length}`);
    expect(Object.keys(m)).toEqual(['dumble']);
    expect(m.dumble).toEqual({ id: 'dumble', url: `u${GOOD.length}`, width: 120, height: 160 });
  });

  it('makes a base64 data URL that decodes back to the same SVG', () => {
    const url = svgDataUrl(GOOD);
    expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(Buffer.from(url.split(',')[1]!, 'base64').toString('utf8')).toBe(GOOD);
  });

  it('picks the smallest tier at least as big as the drawing', () => {
    expect(tierFor(40)).toBe(64);
    expect(tierFor(64)).toBe(64);
    expect(tierFor(90)).toBe(128);
    expect(tierFor(240)).toBe(256);
    expect(tierFor(500)).toBe(SPRITE_TIERS[SPRITE_TIERS.length - 1]);
  });

  it('fits the longest side to the size, keeping the shape', () => {
    expect(fitBox(100, 100, 72)).toEqual({ width: 72, height: 72 });
    expect(fitBox(120, 160, 240)).toEqual({ width: 180, height: 240 });
    expect(monsterKey('rom', 128)).toBe('monster:rom@128');
    expect(characterKey('papai')).toBe('character:papai');
  });
});

describe('the sprite files', () => {
  it('every SVG is safe to rasterize', () => {
    for (const [path, svg] of Object.entries({ ...monsterFiles, ...characterFiles })) expect(svgProblems(svg), path).toEqual([]);
  });

  it('every monster sprite is named after a real monster id', () => {
    const ids = new Set(content.monsters.map((m) => m.id));
    for (const id of Object.keys(monsters)) expect(ids.has(id), `${id}.svg has no monster in monsters.json`).toBe(true);
  });

  it('the 15 base monsters have sprites (Round 61: base character art first)', () => {
    const base = content.monsters.filter((m) => m.evolvesFrom === null && m.kind === 'monster');
    expect(base).toHaveLength(15);
    for (const m of base) expect(monsters[m.id], `${m.id} needs src/assets/sprites/monsters/${m.id}.svg`).toBeDefined();
  });

  it('every monster has a sprite or look data for the fallback drawing', () => {
    for (const m of content.monsters) expect(monsters[m.id] !== undefined || m.art !== undefined, m.id).toBe(true);
  });

  it('the player and Papai have full-size and map sprites', () => {
    for (const id of ['player', 'player-map', 'papai', 'papai-map']) expect(characters[id], id).toBeDefined();
  });
});

describe('item and map sprites', () => {
  const items = buildManifest(readDir('items'), () => 'url');
  const tiles = buildManifest(readDir('tiles'), () => 'url');

  it('every item in items.json has a picture, plus the Magic Gem', () => {
    for (const id of [...content.items.map((i) => i.id), 'gem']) expect(items[id], `src/assets/sprites/items/${id}.svg`).toBeDefined();
  });

  it('the map has a shop, a Reviver, both gate looks for every biome, and a tree for every area', () => {
    const need = ['shop', 'reviver', 'tree-ansonville'];
    for (const b of content.biomes) need.push(`gate-${b.id}-open`, `gate-${b.id}-locked`, `tree-${b.id}`);
    for (const id of need) expect(tiles[id], `src/assets/sprites/tiles/${id}.svg`).toBeDefined();
  });

  it('item and map SVGs are safe to rasterize', () => {
    for (const [path, svg] of Object.entries({ ...readDir('items'), ...readDir('tiles') })) expect(svgProblems(svg), path).toEqual([]);
  });

  it('tiny drawings are rasterized at more times their size', () => {
    expect(rasterScale({ width: 24, height: 24 })).toBe(4);
    expect(rasterScale({ width: 32, height: 40 })).toBe(3);
    expect(rasterScale({ width: 100, height: 160 })).toBe(2);
    expect(spriteKey('item', 'cage')).toBe('item:cage');
  });
});
