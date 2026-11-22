// Papai, the guide (ADR 0004, ADR 0008): scripted answers and "What should I do next?", read from
// src/data/guide.json. Conditions are checked against the game state here, so they are unit-tested.
import type { Content, GuideCondition, GuideTopic } from '../data/schema.ts';
import { readyToEvolve } from './collection.ts';
import type { GameState } from './game.ts';
import { isKnockedOut } from './monster.ts';
import { canTeleport, gateProgress, lockedBiomes } from './world.ts';

/** True when a condition from guide.json holds for this game. */
export function conditionHolds(content: Content, state: GameState, c: GuideCondition): boolean {
  const mapPart = content.items.find((i) => i.effect.kind === 'mapPart');
  switch (c) {
    case 'always':
      return true;
    case 'noMonster':
      return state.team.length === 0 && state.backpack.length === 0;
    case 'hasMonster':
      return state.team.length + state.backpack.length > 0;
    case 'teamTired':
      return state.team.length > 0 && state.team.every(isKnockedOut);
    case 'teamHurt':
      return state.team.some(isKnockedOut);
    case 'lowOnCages':
      return (state.bag.cage ?? 0) < 5;
    case 'canBuyMapPart':
      return !!mapPart && lockedBiomes(content, state).length > 0 && state.gems >= mapPart.price;
    case 'needGemsForMapPart':
      return !!mapPart && lockedBiomes(content, state).length > 0 && state.gems < mapPart.price;
    case 'allBiomesOpen':
      return lockedBiomes(content, state).length === 0;
    case 'readyToEvolve':
      return readyToEvolve(content, state).length > 0;
    case 'teamFull':
      return state.team.length >= content.rules.teamSize;
    case 'canTeleport':
      return canTeleport(content, state);
    case 'arenaOpen':
      return gateProgress(content, state).open && !state.avatarBeaten;
    case 'avatarBeaten':
      return state.avatarBeaten;
  }
}

/** The questions Papai can answer right now (a topic with `unlock` shows once that is true). */
export function topicsFor(content: Content, state: GameState): GuideTopic[] {
  return content.guide.topics.filter((t) => !t.unlock || conditionHolds(content, state, t.unlock));
}

/** "What should I do next?": the first goal in guide.json whose condition holds. */
export function nextGoal(content: Content, state: GameState): string {
  const goal = content.guide.goals.find((g) => conditionHolds(content, state, g.when));
  const text = goal?.text ?? 'Explore, catch monsters, and have fun!';
  const gate = gateProgress(content, state);
  return text.replace('{caught}', String(gate.caught)).replace('{needed}', String(gate.needed));
}
