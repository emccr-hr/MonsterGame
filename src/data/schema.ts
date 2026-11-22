// Zod schemas for every content file in src/data/ (ADR 0003). Adding a monster, move or item is a
// data change only: the game reads these files, and `npm run validate:data` checks them.
// Cross-file checks (a monster's moves exist, evolutions point both ways, ...) live in validate.ts.
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids are lowercase-with-dashes');
const fraction = z.number().min(0).max(1);

export const ELEMENTS = ['fire', 'water', 'earth', 'ice', 'nature'] as const;
export const element = z.enum(ELEMENTS);

/** Power as written in the design docs. The numbers behind each tier are in rules.json (powerTiers). */
export const POWER_TIERS = ['none', 'low', 'low-medium', 'medium', 'medium-high', 'high'] as const;
export const powerTier = z.enum(POWER_TIERS);

export const STATUSES = ['burned', 'frozen'] as const;

// ---- Moves ----------------------------------------------------------------------------------
export const moveEffect = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('alwaysHits') }),
  z.object({ kind: z.literal('burn'), turns: z.number().int().min(1) }),
  z.object({ kind: z.literal('freeze'), chance: fraction }),
  /** Underground for 1 turn (can't be hit), attacks the next turn. */
  z.object({ kind: z.literal('dig') }),
  z.object({ kind: z.literal('attackBoost'), amount: z.number().positive(), maxStacks: z.number().int().min(1) }),
  /** Heal the user by a fraction of the damage dealt (Eat). */
  z.object({ kind: z.literal('drain'), fraction }),
  /** The target's next attack does this much less damage. */
  z.object({ kind: z.literal('weakenNextAttack'), amount: fraction }),
  z.object({ kind: z.literal('healSelf'), fraction }),
  z.object({ kind: z.literal('skipNextTurn') }),
  /** Heal the user's other team monsters (Protect the Queen). */
  z.object({ kind: z.literal('healTeam'), fraction }),
]);

export const move = z.object({
  id,
  name: z.string().min(1),
  element: element.nullable(),
  power: powerTier,
  description: z.string().min(1),
  effects: z.array(moveEffect),
});

// ---- Abilities ------------------------------------------------------------------------------
export const abilityEffect = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ignoreElement'), element, chance: fraction }),
  z.object({ kind: z.literal('immuneToMove'), move: id }),
  z.object({ kind: z.literal('opponentSkipChance'), chance: fraction }),
  z.object({ kind: z.literal('untargetableByTrait'), trait: id }),
  z.object({ kind: z.literal('immuneToStatus'), status: z.enum(STATUSES) }),
  z.object({ kind: z.literal('alwaysFirst') }),
  z.object({ kind: z.literal('damageReduction'), fraction }),
  z.object({ kind: z.literal('evadeChance'), chance: fraction }),
  z.object({ kind: z.literal('drainMultiplier'), multiplier: z.number().positive() }),
  z.object({ kind: z.literal('regenPerTurn'), fraction }),
]);

export const ability = z.object({
  id,
  name: z.string().min(1),
  description: z.string().min(1),
  effect: abilityEffect,
});

// ---- Monsters -------------------------------------------------------------------------------
export const baseStats = z.object({
  hp: z.number().int().positive(),
  attack: z.number().int().positive(),
  defense: z.number().int().positive(),
  speed: z.number().int().positive(),
});

/** A color as "#rrggbb". */
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'colors are "#rrggbb"');

/**
 * Placeholder markings drawn in the accent color (src/ui/monsterArt.ts). "patch" is one big spot on
 * the body and one over the upper-left of the face; "tux" is a penguin front; "segments" splits the
 * body into bands of `body` plus the `extra` colors.
 */
export const MARKINGS = ['none', 'spots', 'stripes', 'belly', 'mask', 'patch', 'tux', 'crown', 'segments'] as const;

/** Each monster's own placeholder look (Art-Direction.md "Interim sprite style"). */
export const monsterArt = z
  .object({
    body: hexColor,
    accent: hexColor,
    markings: z.enum(MARKINGS),
    /** More body colors, only for "segments". */
    extra: z.array(hexColor).min(1).max(6).optional(),
  })
  .refine((a) => (a.markings === 'segments') === (a.extra !== undefined), {
    message: '"extra" colors go with "segments" markings, and only with them',
  });

export const monster = z.object({
  id,
  name: z.string().min(1),
  /** "boss" is Avatar: 5 moves, no ability, can't be caught. */
  kind: z.enum(['monster', 'boss']),
  /** Home biome. Null only for the boss. */
  biome: id.nullable(),
  /** Spawn weight in its biome (bigger = more common). Null for evolve-only forms and the boss. */
  spawnWeight: z.number().positive().nullable(),
  /** Size words from the docs, e.g. "Medium (2x Dumble)". */
  sizeLabel: z.string().min(1),
  /** Size relative to Dumble (Dumble = 1). Drives sprite size. */
  scale: z.number().positive(),
  /** One short line for placeholder art and the Monster Book. */
  look: z.string().min(1),
  /** Placeholder colors and markings, so every monster looks different. */
  art: monsterArt,
  /** Tags other rules can check, e.g. "red-ant" for Colony Bond. */
  traits: z.array(id),
  ability: id.nullable(),
  moves: z.array(id).min(1).max(5),
  evolvesTo: z.object({ monster: id, level: z.number().int().min(1).max(100) }).nullable(),
  evolvesFrom: id.nullable(),
  catchable: z.boolean(),
  baseStats,
});

// ---- World, items, rules, guide -------------------------------------------------------------
export const biome = z.object({
  id,
  name: z.string().min(1),
  element,
  look: z.string().min(1),
});

export const itemEffect = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('catch') }),
  z.object({ kind: z.literal('heal'), hp: z.number().int().positive() }),
  /** Bring back a knocked-out monster with this fraction of its HP. */
  z.object({ kind: z.literal('revive'), fraction }),
  /** Opens one locked biome. */
  z.object({ kind: z.literal('mapPart') }),
  z.object({ kind: z.literal('teleportPin'), maxPlaced: z.number().int().positive(), minLevel: z.number().int().min(1) }),
]);

export const item = z.object({
  id,
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  description: z.string().min(1),
  effect: itemEffect,
});

const range = z.object({ min: z.number().int().nonnegative(), max: z.number().int().nonnegative() });

/** Game-wide numbers from the design docs. Proposals marked in Balance.md are ours to tune. */
export const rules = z.object({
  start: z.object({ cages: z.number().int().nonnegative(), gems: z.number().int().nonnegative() }),
  levelCap: z.number().int().positive(),
  teamSize: z.number().int().positive(),
  gemsPerWin: z.object({ wild: range, trainer: z.number().int().nonnegative() }),
  big: z.object({ chance: fraction, statBoost: z.number().nonnegative(), scale: z.number().positive(), catchMultiplier: fraction }),
  catch: z.object({ base: fraction, missingHpBonus: fraction, cap: fraction, maxFailedThrows: z.number().int().positive() }),
  bossMovePowerBonus: z.number().nonnegative(),
  powerTiers: z.record(powerTier, z.number().nonnegative()),
});

export const guideTip = z.object({ id, screen: z.string().min(1), text: z.string().min(1).max(140) });
export const guide = z.object({ tips: z.array(guideTip) });

// ---- Files ----------------------------------------------------------------------------------
export const contentFiles = {
  monsters: z.array(monster),
  moves: z.array(move),
  abilities: z.array(ability),
  biomes: z.array(biome),
  items: z.array(item),
  rules,
  guide,
} as const;

export type Element = z.infer<typeof element>;
export type PowerTier = z.infer<typeof powerTier>;
export type Move = z.infer<typeof move>;
export type MoveEffect = z.infer<typeof moveEffect>;
export type Ability = z.infer<typeof ability>;
export type AbilityEffect = z.infer<typeof abilityEffect>;
export type Monster = z.infer<typeof monster>;
export type MonsterArt = z.infer<typeof monsterArt>;
export type Markings = MonsterArt['markings'];
export type BaseStats = z.infer<typeof baseStats>;
export type Biome = z.infer<typeof biome>;
export type Item = z.infer<typeof item>;
export type Rules = z.infer<typeof rules>;
export type Guide = z.infer<typeof guide>;

export interface Content {
  monsters: Monster[];
  moves: Move[];
  abilities: Ability[];
  biomes: Biome[];
  items: Item[];
  rules: Rules;
  guide: Guide;
}
