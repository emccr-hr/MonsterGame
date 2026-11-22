// Turn-based 1-on-1 battles (Mechanics.md "Battles", Move-List.md, Final-Boss.md).
// resolveTurn(state, action) returns a NEW state plus events; the battle scene turns events into
// text and animation. Nothing here knows about Phaser.
import type { Ability, Content, Move } from '../data/schema.ts';
import { BALANCE } from './balance.ts';
import { catchChance, throwCage, type ThrowResult } from './catching.ts';
import { isKnockedOut, maxHp, species, statsOf, type MonsterInstance } from './monster.ts';
import type { Rng } from './rng.ts';

export type SideId = 'player' | 'enemy';

/** A monster in battle plus the things that only last for this battle. */
export interface Combatant {
  m: MonsterInstance;
  /** Skips its next action (Frozen). */
  frozen: boolean;
  /** Skips its next action (used Sleep). */
  sleeping: boolean;
  /** Fetch stacks (+20% attack each). Reset when it switches out. */
  boost: number;
  /** Its next attack does this fraction less damage (Slobber, Spit, Screech). */
  weakened: number;
  /** Underground after the first half of Dig: can't be hit, attacks next turn. */
  digging: boolean;
}

export interface Side {
  team: Combatant[];
  /** Index of the monster fighting now, or -1 when the player has no monsters yet (first catch). */
  active: number;
}

export type Outcome = 'won' | 'lost' | 'caught' | 'fled' | 'ran';

export interface BattleState {
  kind: 'wild' | 'boss';
  player: Side;
  enemy: Side;
  turn: number;
  /** Cage throws that missed this wild monster. It runs away at rules.catch.maxFailedThrows. */
  failedThrows: number;
  /** Items the player can use; counts go down as they're used. Copy back to the bag after. */
  bag: Record<string, number>;
  /** True when the player's monster was knocked out and they must pick the next one (free action). */
  mustSwitch: boolean;
  outcome: Outcome | null;
}

export type Action =
  | { kind: 'move'; move: string }
  | { kind: 'switch'; to: number }
  | { kind: 'item'; item: string; target: number }
  | { kind: 'cage' }
  | { kind: 'run' };

export type MissReason = 'underground' | 'slippery' | 'colony' | 'lavaSkin' | 'immune';
export type SkipReason = 'frozen' | 'sleeping' | 'cute';

export type BattleEvent =
  | { type: 'move'; side: SideId; move: string }
  | { type: 'damage'; side: SideId; amount: number; hp: number }
  | { type: 'miss'; side: SideId; reason: MissReason }
  | { type: 'heal'; side: SideId; index: number; amount: number; hp: number }
  | { type: 'status'; side: SideId; status: 'burned' | 'frozen' }
  | { type: 'burnHurt'; side: SideId; amount: number; hp: number }
  | { type: 'skip'; side: SideId; reason: SkipReason }
  | { type: 'dig'; side: SideId }
  | { type: 'boost'; side: SideId; stacks: number }
  | { type: 'weakened'; side: SideId }
  | { type: 'faint'; side: SideId; index: number }
  | { type: 'switch'; side: SideId; index: number }
  | { type: 'item'; item: string; index: number }
  | { type: 'throw'; throw: ThrowResult }
  | { type: 'end'; outcome: Outcome };

export interface TurnResult {
  state: BattleState;
  events: BattleEvent[];
}

const combatant = (m: MonsterInstance): Combatant => ({ m: { ...m, moves: [...m.moves] }, frozen: false, sleeping: false, boost: 0, weakened: 0, digging: false });

/** Starts a battle. The player's first awake monster leads. */
export function startBattle(
  kind: 'wild' | 'boss',
  playerTeam: readonly MonsterInstance[],
  enemy: MonsterInstance,
  bag: Record<string, number>,
): BattleState {
  const team = playerTeam.map(combatant);
  return {
    kind,
    player: { team, active: team.findIndex((c) => !isKnockedOut(c.m)) },
    enemy: { team: [combatant(enemy)], active: 0 },
    turn: 1,
    failedThrows: 0,
    bag: { ...bag },
    mustSwitch: false,
    outcome: null,
  };
}

export const activeOf = (side: Side): Combatant | null => (side.active >= 0 ? side.team[side.active] ?? null : null);

function abilityOf(content: Content, c: Combatant): Ability | null {
  const id = species(content, c.m.species).ability;
  return id ? (content.abilities.find((a) => a.id === id) ?? null) : null;
}

function moveDef(content: Content, id: string): Move {
  const mv = content.moves.find((m) => m.id === id);
  if (!mv) throw new Error(`Unknown move "${id}"`);
  return mv;
}

const deals = (mv: Move) => mv.power !== 'none';
const has = <K extends Move['effects'][number]['kind']>(mv: Move, kind: K) =>
  mv.effects.find((e) => e.kind === kind) as Extract<Move['effects'][number], { kind: K }> | undefined;

/** Why an action isn't allowed right now, or null if it is. */
export function invalidReason(content: Content, s: BattleState, a: Action): string | null {
  if (s.outcome) return 'The battle is over.';
  const me = activeOf(s.player);
  if (s.mustSwitch && a.kind !== 'switch') return 'Pick your next monster.';
  switch (a.kind) {
    case 'move':
      if (!me) return 'You have no monster to fight with yet. Throw a cage!';
      if (!me.m.moves.includes(a.move)) return "Your monster doesn't know that move.";
      return null;
    case 'switch': {
      const to = s.player.team[a.to];
      if (!to || isKnockedOut(to.m)) return 'Pick a monster that is awake.';
      if (a.to === s.player.active) return 'That monster is already fighting.';
      return null;
    }
    case 'item': {
      if ((s.bag[a.item] ?? 0) < 1) return "You don't have that item.";
      const it = content.items.find((i) => i.id === a.item);
      const t = s.player.team[a.target];
      if (!it || !t) return 'Pick an item and a monster.';
      if (it.effect.kind === 'heal') return isKnockedOut(t.m) ? "A potion can't wake up a knocked-out monster." : t.m.hp >= maxHp(content, t.m) ? 'That monster already has full HP.' : null;
      if (it.effect.kind === 'revive') return isKnockedOut(t.m) ? null : 'That monster is awake already.';
      return "You can't use that here.";
    }
    case 'cage': {
      if (s.kind !== 'wild') return "Avatar can't be caught!";
      if ((s.bag.cage ?? 0) < 1) return 'You are out of cages.';
      return null;
    }
    case 'run':
      return s.kind === 'wild' ? null : "You can't run from Avatar!";
  }
}

/** The enemy picks a move: random, but heals only below half HP and skips moves that would do nothing. */
export function chooseEnemyMove(content: Content, s: BattleState, rng: Rng): string {
  const me = activeOf(s.enemy)!;
  const healthy = me.m.hp >= maxHp(content, me.m) / 2;
  const useful = me.m.moves.filter((id) => {
    const mv = moveDef(content, id);
    if (has(mv, 'healSelf') && healthy) return false;
    if (has(mv, 'healTeam') && s.enemy.team.length < 2) return false;
    if (has(mv, 'attackBoost') && me.boost >= has(mv, 'attackBoost')!.maxStacks) return false;
    return true;
  });
  return rng.pick(useful.length ? useful : me.m.moves);
}

/** Who moves first: Quick always first, then higher speed, ties broken by the dice. */
function playerGoesFirst(content: Content, s: BattleState, rng: Rng): boolean {
  const p = activeOf(s.player)!;
  const e = activeOf(s.enemy)!;
  const pq = abilityOf(content, p)?.effect.kind === 'alwaysFirst';
  const eq = abilityOf(content, e)?.effect.kind === 'alwaysFirst';
  if (pq !== eq) return pq;
  const ps = statsOf(content, p.m).speed;
  const es = statsOf(content, e.m).speed;
  return ps === es ? rng.chance(0.5) : ps > es;
}

/** Damage before abilities and misses. Exported for tests and balance checks. */
export function baseDamage(content: Content, attacker: Combatant, defender: Combatant, mv: Move, isBoss: boolean, rng: Rng): number {
  const power = content.rules.powerTiers[mv.power] * (isBoss ? 1 + content.rules.bossMovePowerBonus : 1);
  const boostMove = content.moves.find((m) => has(m, 'attackBoost'));
  const perStack = (boostMove && has(boostMove, 'attackBoost')?.amount) ?? 0;
  const atk = statsOf(content, attacker.m).attack * (1 + perStack * attacker.boost);
  const def = statsOf(content, defender.m).defense;
  const raw = (((2 * attacker.m.level) / 5 + 2) * power * (atk / def)) / BALANCE.DAMAGE_DIVISOR + 2;
  const spread = BALANCE.SPREAD_MIN + (1 - BALANCE.SPREAD_MIN) * rng.next();
  return raw * spread;
}

class Turn {
  events: BattleEvent[] = [];
  readonly content: Content;
  readonly s: BattleState;
  readonly rng: Rng;
  constructor(content: Content, s: BattleState, rng: Rng) {
    this.content = content;
    this.s = s;
    this.rng = rng;
  }

  side = (id: SideId) => (id === 'player' ? this.s.player : this.s.enemy);
  other = (id: SideId): SideId => (id === 'player' ? 'enemy' : 'player');

  heal(id: SideId, index: number, amount: number) {
    const c = this.side(id).team[index]!;
    const max = maxHp(this.content, c.m);
    const gained = Math.min(max - c.m.hp, Math.max(0, Math.floor(amount)));
    if (gained <= 0 || isKnockedOut(c.m)) return;
    c.m.hp += gained;
    this.events.push({ type: 'heal', side: id, index, amount: gained, hp: c.m.hp });
  }

  hurt(id: SideId, amount: number) {
    const c = activeOf(this.side(id))!;
    const dmg = Math.max(1, Math.floor(amount));
    c.m.hp = Math.max(0, c.m.hp - dmg);
    this.events.push({ type: 'damage', side: id, amount: dmg, hp: c.m.hp });
    return dmg;
  }

  /** One side uses a move. Returns quietly if the user or target is already knocked out. */
  useMove(id: SideId, moveId: string) {
    const me = activeOf(this.side(id));
    const foeId = this.other(id);
    const foe = activeOf(this.side(foeId));
    if (!me || isKnockedOut(me.m)) return;

    if (me.frozen) {
      me.frozen = false;
      this.events.push({ type: 'skip', side: id, reason: 'frozen' });
      return;
    }
    if (me.sleeping) {
      me.sleeping = false;
      this.events.push({ type: 'skip', side: id, reason: 'sleeping' });
      return;
    }

    const finishingDig = me.digging;
    const mv = moveDef(this.content, finishingDig ? 'dig' : moveId);
    const targetsFoe = deals(mv) || !!has(mv, 'weakenNextAttack');

    if (targetsFoe && foe) {
      const cute = abilityOf(this.content, foe)?.effect;
      if (cute?.kind === 'opponentSkipChance' && this.rng.chance(cute.chance)) {
        me.digging = false;
        this.events.push({ type: 'skip', side: id, reason: 'cute' });
        return;
      }
    }

    this.events.push({ type: 'move', side: id, move: mv.id });

    // First half of Dig: go underground.
    if (has(mv, 'dig') && !finishingDig) {
      me.digging = true;
      this.events.push({ type: 'dig', side: id });
      return;
    }
    me.digging = false;

    // Moves that only help yourself.
    const boost = has(mv, 'attackBoost');
    if (boost) {
      me.boost = Math.min(boost.maxStacks, me.boost + 1);
      this.events.push({ type: 'boost', side: id, stacks: me.boost });
    }
    const healSelf = has(mv, 'healSelf');
    if (healSelf) this.heal(id, this.side(id).active, maxHp(this.content, me.m) * healSelf.fraction);
    if (has(mv, 'skipNextTurn')) me.sleeping = true;
    const healTeam = has(mv, 'healTeam');
    if (healTeam) {
      this.side(id).team.forEach((c, i) => {
        if (i !== this.side(id).active) this.heal(id, i, maxHp(this.content, c.m) * healTeam.fraction);
      });
    }
    if (!targetsFoe || !foe || isKnockedOut(foe.m)) return;

    // From here the move hits (or misses) the other monster.
    const miss = this.missReason(me, foe, mv);
    if (miss) {
      this.events.push({ type: 'miss', side: foeId, reason: miss });
      return;
    }

    if (deals(mv)) {
      let dmg = baseDamage(this.content, me, foe, mv, this.s.kind === 'boss' && id === 'enemy', this.rng);
      if (me.weakened) {
        dmg *= 1 - me.weakened;
        me.weakened = 0;
      }
      const foeAbility = abilityOf(this.content, foe)?.effect;
      if (foeAbility?.kind === 'damageReduction') dmg *= 1 - foeAbility.fraction;
      const dealt = this.hurt(foeId, dmg);

      const drain = has(mv, 'drain');
      if (drain) {
        const mine = abilityOf(this.content, me)?.effect;
        const mult = mine?.kind === 'drainMultiplier' ? mine.multiplier : 1;
        this.heal(id, this.side(id).active, dealt * drain.fraction * mult);
      }
    }
    if (isKnockedOut(foe.m)) return;

    const burn = has(mv, 'burn');
    if (burn && !this.immuneTo(foe, 'burned')) {
      foe.m.burned = burn.turns;
      this.events.push({ type: 'status', side: foeId, status: 'burned' });
    }
    const freeze = has(mv, 'freeze');
    if (freeze && !this.immuneTo(foe, 'frozen') && this.rng.chance(freeze.chance)) {
      foe.frozen = true;
      this.events.push({ type: 'status', side: foeId, status: 'frozen' });
    }
    const weaken = has(mv, 'weakenNextAttack');
    if (weaken) {
      foe.weakened = weaken.amount;
      this.events.push({ type: 'weakened', side: foeId });
    }
  }

  immuneTo(c: Combatant, status: 'burned' | 'frozen') {
    const e = abilityOf(this.content, c)?.effect;
    return e?.kind === 'immuneToStatus' && e.status === status;
  }

  missReason(me: Combatant, foe: Combatant, mv: Move): MissReason | null {
    if (foe.digging) return 'underground';
    const e = abilityOf(this.content, foe)?.effect;
    const myTraits = species(this.content, me.m.species).traits;
    if (e?.kind === 'untargetableByTrait' && myTraits.includes(e.trait)) return 'colony';
    if (e?.kind === 'immuneToMove' && e.move === mv.id) return 'immune';
    if (e?.kind === 'ignoreElement' && mv.element === e.element && this.rng.chance(e.chance)) return 'lavaSkin';
    if (e?.kind === 'evadeChance' && !has(mv, 'alwaysHits') && this.rng.chance(e.chance)) return 'slippery';
    return null;
  }

  /** End of turn: Burned hurts, Water Storage heals. */
  endOfTurn() {
    for (const id of ['player', 'enemy'] as const) {
      const c = activeOf(this.side(id));
      if (!c || isKnockedOut(c.m)) continue;
      if (c.m.burned > 0) {
        c.m.burned--;
        const amount = Math.max(1, Math.floor(maxHp(this.content, c.m) * BALANCE.BURN_DAMAGE));
        c.m.hp = Math.max(0, c.m.hp - amount);
        this.events.push({ type: 'burnHurt', side: id, amount, hp: c.m.hp });
        if (isKnockedOut(c.m)) continue;
      }
      const e = abilityOf(this.content, c)?.effect;
      if (e?.kind === 'regenPerTurn') this.heal(id, this.side(id).active, maxHp(this.content, c.m) * e.fraction);
    }
  }

  /** Knock-outs: the enemy has one monster, so knocking it out wins. */
  checkFaints() {
    const e = activeOf(this.s.enemy);
    const p = activeOf(this.s.player);
    if (p && isKnockedOut(p.m) && !this.s.mustSwitch) {
      this.events.push({ type: 'faint', side: 'player', index: this.s.player.active });
      p.frozen = p.sleeping = p.digging = false;
      if (this.s.player.team.some((c) => !isKnockedOut(c.m))) this.s.mustSwitch = true;
    }
    if (e && isKnockedOut(e.m)) {
      this.events.push({ type: 'faint', side: 'enemy', index: this.s.enemy.active });
      this.end('won');
    } else if (p && this.s.player.team.every((c) => isKnockedOut(c.m))) {
      this.end('lost');
    }
  }

  end(outcome: Outcome) {
    if (this.s.outcome) return;
    this.s.outcome = outcome;
    this.s.mustSwitch = false;
    this.events.push({ type: 'end', outcome });
  }
}

function switchTo(s: BattleState, to: number) {
  const out = activeOf(s.player);
  if (out) Object.assign(out, { boost: 0, weakened: 0, digging: false, sleeping: false, frozen: false });
  s.player.active = to;
}

/** Plays one turn: the player's action, the enemy's move, then end-of-turn effects. */
export function resolveTurn(content: Content, state: BattleState, action: Action, rng: Rng): TurnResult {
  const why = invalidReason(content, state, action);
  if (why) throw new Error(why);
  const s: BattleState = structuredClone(state);
  const t = new Turn(content, s, rng);

  // A free switch after a knock-out: no turn passes.
  if (s.mustSwitch && action.kind === 'switch') {
    s.mustSwitch = false;
    switchTo(s, action.to);
    t.events.push({ type: 'switch', side: 'player', index: action.to });
    return { state: s, events: t.events };
  }

  let playerMove: string | null = null;
  switch (action.kind) {
    case 'run':
      t.end('ran');
      return { state: s, events: t.events };
    case 'cage': {
      s.bag.cage = (s.bag.cage ?? 0) - 1;
      const wild = activeOf(s.enemy)!;
      const chance = catchChance(wild.m.hp, maxHp(content, wild.m), wild.m.big, content.rules);
      const thrown = throwCage(chance, s.failedThrows, content.rules, rng);
      t.events.push({ type: 'throw', throw: thrown });
      if (thrown.result === 'caught') {
        t.end('caught');
        return { state: s, events: t.events };
      }
      s.failedThrows = thrown.failedThrows;
      if (thrown.ranAway) {
        t.end('fled');
        return { state: s, events: t.events };
      }
      break;
    }
    case 'switch':
      switchTo(s, action.to);
      t.events.push({ type: 'switch', side: 'player', index: action.to });
      break;
    case 'item': {
      const it = content.items.find((i) => i.id === action.item)!;
      s.bag[action.item] = (s.bag[action.item] ?? 0) - 1;
      const target = s.player.team[action.target]!;
      t.events.push({ type: 'item', item: it.id, index: action.target });
      if (it.effect.kind === 'heal') t.heal('player', action.target, it.effect.hp);
      else if (it.effect.kind === 'revive') {
        const hp = Math.max(1, Math.floor(maxHp(content, target.m) * it.effect.fraction));
        target.m.hp = hp;
        target.m.burned = 0;
        t.events.push({ type: 'heal', side: 'player', index: action.target, amount: hp, hp });
      }
      break;
    }
    case 'move':
      playerMove = action.move;
      break;
  }

  // The enemy only attacks if there's a monster to attack (not during the very first catch).
  const enemyMove = activeOf(s.player) ? chooseEnemyMove(content, s, rng) : null;
  if (playerMove && enemyMove) {
    const first: [SideId, string][] = playerGoesFirst(content, s, rng)
      ? [['player', playerMove], ['enemy', enemyMove]]
      : [['enemy', enemyMove], ['player', playerMove]];
    for (const [id, mv] of first) t.useMove(id, mv);
  } else if (enemyMove) {
    t.useMove('enemy', enemyMove);
  }

  t.endOfTurn();
  t.checkFaints();
  s.turn++;
  return { state: s, events: t.events };
}
