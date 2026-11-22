// What the battle screen shows (M4): menu choices, battle text, and sprite sizes.
// Plain functions, no Phaser, so they are unit-tested; BattleScene only draws what these return.
import type { Content } from '../data/schema.ts';
import { activeOf, type Action, type BattleEvent, type BattleState, type SideId } from './battle.ts';
import { isKnockedOut, maxHp, species } from './monster.ts';

export interface MenuChoice {
  label: string;
  /** The action to play, or a sub-menu to open. */
  pick: Action | { kind: 'fight' } | { kind: 'bag' } | { kind: 'team' };
}

/**
 * The main menu. With no monster to fight with (the very first catch), the only choice is
 * "Throw cage" (designer, Round 61). Avatar can't be caged or run from.
 */
export function mainMenu(s: BattleState): MenuChoice[] {
  if (!activeOf(s.player)) {
    const choices: MenuChoice[] = [{ label: 'Throw cage', pick: { kind: 'cage' } }];
    // Monsters, but all knocked out: you may also run.
    if (s.player.team.length > 0) choices.push({ label: 'Run', pick: { kind: 'run' } });
    return choices;
  }
  const choices: MenuChoice[] = [{ label: 'Fight', pick: { kind: 'fight' } }];
  if (s.kind === 'wild') choices.push({ label: `Cage (${s.bag.cage ?? 0})`, pick: { kind: 'cage' } });
  choices.push({ label: 'Bag', pick: { kind: 'bag' } }, { label: 'Switch', pick: { kind: 'team' } });
  if (s.kind === 'wild') choices.push({ label: 'Run', pick: { kind: 'run' } });
  return choices;
}

export function moveMenu(content: Content, s: BattleState): MenuChoice[] {
  const me = activeOf(s.player);
  if (!me) return [];
  return me.m.moves.map((id) => ({ label: content.moves.find((m) => m.id === id)?.name ?? id, pick: { kind: 'move', move: id } }));
}

/** Healing items in the bag. A potion goes to the monster fighting; a Wake-Up Snack to the first knocked-out one. */
export function bagMenu(content: Content, s: BattleState): MenuChoice[] {
  const choices: MenuChoice[] = [];
  for (const it of content.items) {
    const have = s.bag[it.id] ?? 0;
    if (have < 1) continue;
    if (it.effect.kind === 'heal' && s.player.active >= 0) {
      choices.push({ label: `${it.name} (${have})`, pick: { kind: 'item', item: it.id, target: s.player.active } });
    } else if (it.effect.kind === 'revive') {
      const target = s.player.team.findIndex((c) => isKnockedOut(c.m));
      if (target >= 0) choices.push({ label: `${it.name} (${have})`, pick: { kind: 'item', item: it.id, target } });
    }
  }
  return choices;
}

/** Team monsters you could switch to (awake and not already fighting). */
export function teamMenu(content: Content, s: BattleState): MenuChoice[] {
  return s.player.team.flatMap((c, i) =>
    i === s.player.active || isKnockedOut(c.m)
      ? []
      : [{ label: `${species(content, c.m.species).name}  Lv ${c.m.level}  ${c.m.hp}/${maxHp(content, c.m)} HP`, pick: { kind: 'switch', to: i } as Action }],
  );
}

/** "Bushtail" for yours, "the wild Bushtail" for the other side (or just "Avatar"). */
export function sideName(content: Content, s: BattleState, side: SideId, index?: number): string {
  const team = side === 'player' ? s.player : s.enemy;
  const c = index === undefined ? activeOf(team) : team.team[index];
  if (!c) return 'Your monster';
  const name = species(content, c.m.species).name;
  if (side === 'player') return name;
  return s.kind === 'boss' ? name : `the wild ${name}`;
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * One short line of battle text for an event, or null when the screen shows it another way
 * (damage moves the HP bar). `s` is the battle state after the turn, for names.
 */
export function eventText(content: Content, s: BattleState, e: BattleEvent): string | null {
  const who = (side: SideId, index?: number) => capital(sideName(content, s, side, index));
  switch (e.type) {
    case 'move':
      return `${who(e.side)} used ${content.moves.find((m) => m.id === e.move)?.name ?? e.move}!`;
    case 'damage':
      return null;
    case 'miss':
      switch (e.reason) {
        case 'underground':
          return `It missed! ${who(e.side)} is underground.`;
        case 'slippery':
          return `${who(e.side)} slipped away!`;
        case 'colony':
          return "Red ants won't fight each other! Switch or run.";
        case 'lavaSkin':
          return `${who(e.side)}'s lava skin blocked it!`;
        case 'immune':
          return `It didn't work on ${sideName(content, s, e.side)}!`;
      }
      return null;
    case 'heal':
      return `${who(e.side, e.index)} got ${e.amount} HP back.`;
    case 'status':
      return e.status === 'burned' ? `${who(e.side)} is burned!` : `${who(e.side)} is frozen!`;
    case 'burnHurt':
      return `${who(e.side)} is hurt by its burn.`;
    case 'skip':
      if (e.reason === 'frozen') return `${who(e.side)} is frozen and can't move!`;
      if (e.reason === 'sleeping') return `${who(e.side)} is sleeping.`;
      return `${who(e.side)} can't attack something so cute!`;
    case 'dig':
      return `${who(e.side)} dug underground!`;
    case 'boost':
      return `${who(e.side)} is getting stronger!`;
    case 'weakened':
      return `${who(e.side)}'s next attack will be weaker.`;
    case 'faint':
      return `${who(e.side, e.index)} was knocked out!`;
    case 'switch':
      return `Go, ${sideName(content, s, 'player', e.index)}!`;
    case 'item':
      return `You used a ${content.items.find((i) => i.id === e.item)?.name ?? e.item}.`;
    case 'throw':
      return e.throw.result === 'caught' ? `Gotcha! You caught ${sideName(content, s, 'enemy')}!` : 'Oh no! It broke free!';
    case 'end':
      switch (e.outcome) {
        case 'won':
          return 'You won!';
        case 'lost':
          return 'All your monsters are knocked out...';
        case 'fled':
          return `${who('enemy')} ran away!`;
        case 'ran':
          return 'You got away safely.';
        case 'caught':
          return null; // The throw line already said it.
      }
  }
  return null;
}

/**
 * Battle sprite size in pixels for a monster `scale` times Dumble's size. Sizes are squeezed so a
 * 10x Avatar still fits beside a 1x Dumble (Art-Direction.md; proposed rule from Art-Mockups.html).
 */
export function battleSpriteSize(scale: number): number {
  return Math.round(Math.min(240, Math.max(56, 72 * Math.sqrt(Math.max(0, scale)))));
}
