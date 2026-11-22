// Tuning numbers for the rules that aren't content. All proposals; see 02-Gameplay/Balance.md.
// Content numbers (move power words, prices, catch formula, Big Monster) live in src/data/rules.json.

export const BALANCE = {
  /** HP at level L = base HP × (HP_LEVEL_BASE + L) / HP_LEVEL_BASE. */
  HP_LEVEL_BASE: 10,
  /** Attack/Defense/Speed at level L = base × (STAT_LEVEL_BASE + L) / STAT_LEVEL_BASE. */
  STAT_LEVEL_BASE: 20,
  /** Damage = ((2L/5 + 2) × power × attack/defense) / DAMAGE_DIVISOR + 2, then the spread. */
  DAMAGE_DIVISOR: 12,
  /** Random damage spread: × a number from SPREAD_MIN to 1. */
  SPREAD_MIN: 0.85,
  /** Burned: lose this fraction of max HP at the end of each burned turn. */
  BURN_DAMAGE: 0.1,
  /** XP to go from level L to L+1 = XP_PER_LEVEL × L. */
  XP_PER_LEVEL: 10,
  /** XP for beating a wild monster of level L = XP_YIELD × L (every awake team monster gets it). */
  XP_YIELD: 4,
  /** Wild level = team's average level ± WILD_LEVEL_SPREAD (Flags X18), at least WILD_MIN_LEVEL. */
  WILD_LEVEL_SPREAD: 2,
  WILD_MIN_LEVEL: 2,
  /** With no team yet (first catch), wild monsters are level 2 to 4. */
  FIRST_CATCH_LEVEL: { min: 2, max: 4 },
  /** Avatar's level when the arena opens: the team's best level + this, at least AVATAR_MIN_LEVEL. */
  AVATAR_LEVEL_BONUS: 5,
  AVATAR_MIN_LEVEL: 30,
} as const;
