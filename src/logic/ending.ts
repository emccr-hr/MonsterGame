// Avatar's arena and the ending (M6b; Final-Boss.md, Story-Outline.md "Ending(s)"). Plain TypeScript
// with no Phaser, so the scenes only show what these functions decide (ADR 0002).
import type { Content } from '../data/schema.ts';
import type { GameState } from './game.ts';
import { isKnockedOut } from './monster.ts';
import { gateProgress } from './world.ts';

/** What happens when the player walks into the arena gate. */
export interface ArenaGate {
  battle: boolean;
  text: string;
}

/**
 * The gate opens once every wild monster is caught (Rounds 50, 52). After Avatar is beaten the
 * game keeps going (Round 63) and the arena stays open for a rematch (simplest option; Open-Questions).
 */
export function arenaGate(content: Content, state: GameState): ArenaGate {
  const gate = gateProgress(content, state);
  if (!gate.open) {
    return { battle: false, text: `Avatar's arena is locked. Monsters caught: ${gate.caught} / ${gate.needed}. Catch them all to open it!` };
  }
  if (!state.team.some((m) => !isKnockedOut(m))) return { battle: false, text: 'Your team is too tired to face Avatar. Heal at the Reviver first!' };
  return { battle: true, text: state.avatarBeaten ? 'Avatar wants a rematch!' : 'The arena gate opens... Avatar is waiting!' };
}

/** Whether a won boss battle should play the ending: only the first time (rematches don't). */
export const playsEnding = (before: GameState, after: GameState): boolean => !before.avatarBeaten && after.avatarBeaten;

/** "Your adventure" lines in the credits, from the save. */
export function adventureLines(content: Content, state: GameState): string[] {
  const kinds = content.monsters.filter((m) => m.kind === 'monster').length;
  const all = [...state.team, ...state.backpack];
  const best = all.reduce((top, m) => Math.max(top, m.level), 0);
  return [
    `Monsters caught: ${state.caught.length} of ${kinds} kinds`,
    `Big Monsters caught: ${state.caughtBig.length}`,
    `Monsters on your team and in your backpack: ${all.length}`,
    `Highest level: ${best}`,
  ];
}
