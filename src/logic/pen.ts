// Ansonville's monster pen (designer, Round 89): up to 5 monsters rest there and walk around. They
// can't battle until taken out, and they gain XP over real time while the game is open, about as
// fast as battling (rules.pen). Time with the game closed doesn't count.
import type { Content } from '../data/schema.ts';
import { fail, ok, type GameState, type Result } from './game.ts';
import { addXp } from './growth.ts';
import { species } from './monster.ts';

/** XP one pen monster earns per real minute: like beating a wild monster of its own level. */
export const penXpPerMinute = (content: Content, level: number): number => Math.floor(content.rules.pen.xpPerMinutePerLevel * level);

/** Put a team or backpack monster in the pen. The team can't be left empty. */
export function putInPen(content: Content, state: GameState, uid: number): Result<GameState> {
  if (state.pen.length >= content.rules.pen.size) return fail(`The pen is full (${content.rules.pen.size} monsters). Take one out first.`);
  const inTeam = state.team.find((m) => m.uid === uid);
  const inPack = state.backpack.find((m) => m.uid === uid);
  const m = inTeam ?? inPack;
  if (!m) return fail('That monster is not with you.');
  if (inTeam && state.team.length === 1) return fail('Keep at least one monster on your team.');
  if (state.riding === uid) return fail(`Get off ${species(content, m.species).name} first.`);
  return ok({
    ...state,
    team: state.team.filter((x) => x.uid !== uid),
    backpack: state.backpack.filter((x) => x.uid !== uid),
    pen: [...state.pen, m],
  });
}

/** Take a monster out: to the team if there's room, otherwise to the backpack. */
export function takeFromPen(content: Content, state: GameState, uid: number): Result<GameState> {
  const m = state.pen.find((x) => x.uid === uid);
  if (!m) return fail('That monster is not in the pen.');
  const pen = state.pen.filter((x) => x.uid !== uid);
  if (state.team.length < content.rules.teamSize) return ok({ ...state, pen, team: [...state.team, m] });
  return ok({ ...state, pen, backpack: [...state.backpack, m] });
}

/** Real time passes: every pen monster gains XP and may level up. Returns who leveled up. */
export function penTick(content: Content, state: GameState, minutes: number): { state: GameState; leveledUp: string[] } {
  if (state.pen.length === 0 || minutes <= 0) return { state, leveledUp: [] };
  const leveledUp: string[] = [];
  const pen = state.pen.map((m) => {
    const grown = addXp(content, m, penXpPerMinute(content, m.level) * minutes);
    if (grown.levelsGained > 0) leveledUp.push(species(content, m.species).name);
    return grown.monster;
  });
  return { state: { ...state, pen }, leveledUp };
}
