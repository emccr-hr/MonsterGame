// Vector sprites (M8, Art-Direction.md): one SVG file per monster or character, found by file name.
// Plain TypeScript with no Phaser import, so the rules here are unit-tested (tests/unit/ui).
// A monster's sprite is `src/assets/sprites/monsters/<monster id>.svg`; dropping a file in adds it,
// with no code change (ADR 0003). A monster without a file is drawn from its `art` look data.

/** Each sprite is rasterized at these sizes (longest side, px); a drawing uses the nearest one at least as big. */
export const SPRITE_TIERS = [64, 128, 256] as const;

export interface SpriteSource {
  id: string;
  url: string;
  /** Size of the SVG's viewBox, used to keep its shape when it's rasterized. */
  width: number;
  height: number;
}

/** "../assets/sprites/monsters/anti-ant.svg" → "anti-ant". */
export function idFromPath(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.svg$/i, '');
}

/** The viewBox width and height of an SVG, or undefined if it has none (such a file is skipped). */
export function viewBoxSize(svg: string): { width: number; height: number } | undefined {
  const m = /<svg\b[^>]*\bviewBox="([^"]+)"/.exec(svg);
  if (!m?.[1]) return undefined;
  const parts = m[1].trim().split(/[\s,]+/).map(Number);
  const [, , width, height] = parts;
  if (parts.length !== 4 || !width || !height || !(width > 0) || !(height > 0)) return undefined;
  return { width, height };
}

/** Problems that would stop an SVG from showing safely in the game (empty list = fine). */
export function svgProblems(svg: string): string[] {
  const problems: string[] = [];
  if (!/^\s*<svg\b/.test(svg)) problems.push('must start with <svg>');
  if (!/<svg\b[^>]*\bxmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(svg)) problems.push('needs xmlns="http://www.w3.org/2000/svg"');
  if (!viewBoxSize(svg)) problems.push('needs a viewBox');
  if (/<script\b/i.test(svg)) problems.push('no <script>');
  if (/<image\b/i.test(svg)) problems.push('no embedded images');
  // Only same-file links like url(#glow) or href="#id"; an outside link would fail when rasterized.
  if (/\b(?:xlink:)?href="(?!#)/i.test(svg) || /url\((?!#)/i.test(svg)) problems.push('no links to other files');
  return problems;
}

/**
 * Turns Vite's `?raw` glob of a folder (path → SVG text) into sprite sources keyed by id, with
 * `toUrl` making each file's load URL. Files without a usable viewBox are left out (and fail the
 * unit test).
 */
export function buildManifest(raws: Record<string, string>, toUrl: (svg: string) => string): Record<string, SpriteSource> {
  const out: Record<string, SpriteSource> = {};
  for (const [path, svg] of Object.entries(raws)) {
    const size = viewBoxSize(svg);
    if (!size) continue;
    const id = idFromPath(path);
    out[id] = { id, url: toUrl(svg), ...size };
  }
  return out;
}

/**
 * A base64 data URL for an SVG. Phaser's loader reads data URLs only as base64 (Vite's own
 * inlined URLs aren't), and base64 also keeps every sprite inside the game bundle.
 */
export function svgDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}

/** The smallest tier at least `px` big (the biggest tier if none is). */
export function tierFor(px: number): number {
  return SPRITE_TIERS.find((t) => t >= px) ?? SPRITE_TIERS[SPRITE_TIERS.length - 1]!;
}

/** Width and height that keep the sprite's shape with its longest side `px`. */
export function fitBox(width: number, height: number, px: number): { width: number; height: number } {
  const k = px / Math.max(width, height);
  return { width: width * k, height: height * k };
}

export const monsterKey = (id: string, tier: number): string => `monster:${id}@${tier}`;
export const characterKey = (id: string): string => `character:${id}`;

/** Sprite folders other than monsters, each loaded at one size. */
export type SpriteGroup = 'character' | 'item' | 'tile';
export const spriteKey = (group: SpriteGroup, id: string): string => `${group}:${id}`;

/** How many times its viewBox size a sprite is rasterized: tiny drawings get more, to stay sharp. */
export const rasterScale = (s: { width: number; height: number }): number => {
  const longest = Math.max(s.width, s.height);
  return longest <= 24 ? 4 : longest <= 64 ? 3 : 2;
};
