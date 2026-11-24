// Glue between a battle and the saved game: starting wild and Avatar battles, and applying the
// result (XP, gems, catches, waking up at the Reviver).
import type { Content } from '../data/schema.ts';
import { BALANCE } from './balance.ts';
import { activeOf, startBattle, type BattleState } from './battle.ts';
import { addCaught, markSeen, replaceMonster, type GameState } from './game.ts';
import { addXp, xpYield } from './growth.ts';
import { createMonster, isKnockedOut, type MonsterInstance } from './monster.ts';
import type { Rng } from './rng.ts';
import { rollSpawn, type Spawn } from './spawning.ts';
import { addGems, useReviver, wildBattleGems } from './world.ts';

/**
 * A wild monster appears in a biome: spawn it, mark it seen, and start the battle. `seen` is a
 * monster the player walked into on the map (Round 62); without it, a hidden one is rolled.
 */
export function startWildEncounter(
  content: Content,
  state: GameState,
  biome: string,
  rng: Rng,
  seen?: Spawn,
): { state: GameState; battle: BattleState } {
  const spawn = seen ?? rollSpawn(content, biome, state.team.map((m) => m.level), rng);
  const wild = createMonster(content, spawn.species, spawn.level, spawn.big, 0);
  return { state: markSeen(state, wild.species), battle: startBattle('wild', state.team, wild, state.bag) };
}

/** Avatar's level: the team's best level + 5, at least 30 (proposal; Balance.md). */
export function avatarLevel(state: GameState): number {
  const best = Math.max(0, ...state.team.map((m) => m.level));
  return Math.max(BALANCE.AVATAR_MIN_LEVEL, best + BALANCE.AVATAR_LEVEL_BONUS);
}

export function startAvatarBattle(content: Content, state: GameState): BattleState {
  const boss = content.monsters.find((m) => m.kind === 'boss');
  if (!boss) throw new Error('No boss in monsters.json');
  return startBattle('boss', state.team, createMonster(content, boss.id, avatarLevel(state), false, 0), state.bag);
}

export interface BattleRewards {
  xp: number;
  gems: number;
  /** Team monsters that went up a level: uid → levels gained. */
  levelUps: Record<number, number>;
  /** Team monsters ready to evolve now: uid → species they evolve into. */
  evolutions: Record<number, string>;
  caught: MonsterInstance | null;
  caughtToTeam: boolean;
}

/**
 * Applies a finished battle to the game. Win: every awake team monster gets XP (shared team XP),
 * plus gems for a wild win. Caught: the monster joins. Lost: wake up at the last Reviver, healed.
 */
export function finishBattle(content: Content, state: GameState, battle: BattleState, rng: Rng): { state: GameState; rewards: BattleRewards } {
  if (!battle.outcome) throw new Error('The battle is not over yet.');
  const rewards: BattleRewards = { xp: 0, gems: 0, levelUps: {}, evolutions: {}, caught: null, caughtToTeam: false };

  // Copy HP and Burned back from the battle (statuses that only last a battle are dropped).
  let next: GameState = { ...state, bag: { ...battle.bag } };
  for (const c of battle.player.team) next = replaceMonster(next, { ...c.m });

  const enemy = activeOf(battle.enemy)!.m;
  /** XP for every awake team monster (none on the very first catch, with no team yet), and gems. */
  const giveRewards = (s: GameState): GameState => {
    const awake = s.team.filter((m) => !isKnockedOut(m));
    rewards.xp = awake.length ? xpYield(enemy.level) : 0;
    rewards.gems = wildBattleGems(content, rng);
    let out = addGems(s, rewards.gems);
    for (const m of awake) {
      const grown = addXp(content, m, rewards.xp);
      if (grown.levelsGained) rewards.levelUps[m.uid] = grown.levelsGained;
      if (grown.canEvolveInto) rewards.evolutions[m.uid] = grown.canEvolveInto;
      out = replaceMonster(out, grown.monster);
    }
    return out;
  };
  switch (battle.outcome) {
    case 'won': {
      if (battle.kind === 'boss') {
        next = { ...next, avatarBeaten: true };
        break;
      }
      next = giveRewards(next);
      break;
    }
    case 'caught': {
      // A catch pays like a win (designer, Round 77): the team that fought gets the XP and gems
      // before the new monster joins.
      next = giveRewards(next);
      const added = addCaught(content, next, enemy);
      next = added.state;
      rewards.caught = added.monster;
      rewards.caughtToTeam = added.toTeam;
      break;
    }
    case 'lost':
      next = useReviver(content, next, next.lastReviver);
      break;
    case 'fled':
    case 'ran':
      break;
  }
  return { state: { ...next, rngState: rng.getState() }, rewards };
}
