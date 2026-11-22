// Checks all content files together: each file against its schema, then the links between files.
// Pure (no file access) so unit tests and scripts/validate-data.mjs share it.
import { contentFiles, type Content } from './schema.ts';

export type RawContent = Record<keyof typeof contentFiles, unknown>;

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  content?: Content;
}

export function validateContent(raw: RawContent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Each file against its schema.
  const parsed: Partial<Record<keyof Content, unknown>> = {};
  for (const key of Object.keys(contentFiles) as (keyof typeof contentFiles)[]) {
    const result = contentFiles[key].safeParse(raw[key]);
    if (result.success) parsed[key] = result.data;
    else for (const issue of result.error.issues) errors.push(`${key}.json ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  if (errors.length) return { errors, warnings };
  const c = parsed as Content;

  // 2. Unique ids in each list.
  for (const key of ['monsters', 'moves', 'abilities', 'biomes', 'items'] as const) {
    const seen = new Set<string>();
    for (const { id } of c[key]) {
      if (seen.has(id)) errors.push(`${key}.json: duplicate id "${id}"`);
      seen.add(id);
    }
  }
  const tipIds = new Set<string>();
  for (const { id } of c.guide.tips) {
    if (tipIds.has(id)) errors.push(`guide.json: duplicate tip id "${id}"`);
    tipIds.add(id);
  }

  const monsters = new Map(c.monsters.map((m) => [m.id, m]));
  const moves = new Set(c.moves.map((m) => m.id));
  const abilities = new Set(c.abilities.map((a) => a.id));
  const biomes = new Set(c.biomes.map((b) => b.id));
  const usedMoves = new Set<string>();
  const usedAbilities = new Set<string>();

  // 3. Monsters.
  for (const m of c.monsters) {
    const where = `monsters.json "${m.id}"`;
    for (const mv of m.moves) {
      usedMoves.add(mv);
      if (!moves.has(mv)) errors.push(`${where}: move "${mv}" is not in moves.json`);
    }
    if (new Set(m.moves).size !== m.moves.length) errors.push(`${where}: lists a move twice`);

    if (m.kind === 'boss') {
      if (m.ability !== null) errors.push(`${where}: the boss has no ability`);
      if (m.catchable) errors.push(`${where}: the boss can't be caught`);
      if (m.spawnWeight !== null || m.evolvesTo || m.evolvesFrom) errors.push(`${where}: the boss doesn't spawn or evolve`);
      continue;
    }

    if (m.moves.length > 4) errors.push(`${where}: monsters know at most 4 moves`);
    if (m.ability === null) errors.push(`${where}: every monster has 1 ability`);
    else {
      usedAbilities.add(m.ability);
      if (!abilities.has(m.ability)) errors.push(`${where}: ability "${m.ability}" is not in abilities.json`);
    }
    if (m.biome === null || !biomes.has(m.biome)) errors.push(`${where}: biome "${m.biome}" is not in biomes.json`);

    const isBase = m.evolvesFrom === null;
    if (isBase && m.spawnWeight === null) errors.push(`${where}: a first form needs a spawn weight`);
    if (!isBase && m.spawnWeight !== null) errors.push(`${where}: evolved forms don't spawn (spawnWeight must be null)`);

    if (m.evolvesTo) {
      const next = monsters.get(m.evolvesTo.monster);
      if (!next) errors.push(`${where}: evolves into "${m.evolvesTo.monster}", which doesn't exist`);
      else {
        if (next.evolvesFrom !== m.id) errors.push(`${where}: "${next.id}" should say it evolves from "${m.id}"`);
        if (next.biome !== m.biome) errors.push(`${where}: its evolution "${next.id}" is in a different biome`);
      }
    }
    if (m.evolvesFrom) {
      const prev = monsters.get(m.evolvesFrom);
      if (!prev) errors.push(`${where}: evolves from "${m.evolvesFrom}", which doesn't exist`);
      else if (prev.evolvesTo?.monster !== m.id) errors.push(`${where}: "${prev.id}" should say it evolves into "${m.id}"`);
    }
  }

  const bosses = c.monsters.filter((m) => m.kind === 'boss');
  if (bosses.length !== 1) errors.push(`monsters.json: expected exactly 1 boss, found ${bosses.length}`);

  // 4. Abilities that point at other things.
  for (const a of c.abilities) {
    if (a.effect.kind === 'immuneToMove' && !moves.has(a.effect.move)) {
      errors.push(`abilities.json "${a.id}": move "${a.effect.move}" is not in moves.json`);
    }
    if (a.effect.kind === 'untargetableByTrait') {
      const trait = a.effect.trait;
      if (!c.monsters.some((m) => m.traits.includes(trait))) warnings.push(`abilities.json "${a.id}": no monster has trait "${trait}"`);
    }
  }

  // 5. Biomes: every biome has a wild monster.
  for (const b of c.biomes) {
    if (!c.monsters.some((m) => m.biome === b.id && m.spawnWeight !== null)) {
      errors.push(`biomes.json "${b.id}": no wild monster spawns here`);
    }
  }

  // 6. Rules.
  const r = c.rules;
  if (r.gemsPerWin.wild.min > r.gemsPerWin.wild.max) errors.push('rules.json gemsPerWin.wild: min is above max');
  for (const m of c.monsters) {
    if (m.evolvesTo && m.evolvesTo.level > r.levelCap) errors.push(`monsters.json "${m.id}": evolves above the level cap`);
  }

  // 7. Unused content is allowed, but worth knowing about.
  for (const mv of moves) if (!usedMoves.has(mv)) warnings.push(`moves.json "${mv}": no monster knows this move`);
  for (const a of abilities) if (!usedAbilities.has(a)) warnings.push(`abilities.json "${a}": no monster has this ability`);

  return errors.length ? { errors, warnings } : { errors, warnings, content: c };
}

/** The base forms that count for the Avatar gate (Round 52): every monster that spawns in the wild. */
export function gateMonsters(content: Content): string[] {
  return content.monsters.filter((m) => m.kind === 'monster' && m.spawnWeight !== null).map((m) => m.id);
}
