# Art Direction

## Style (pixel, low-poly, hand-drawn, ...)
Hand-drawn: the designer's own monster drawings, scanned or photographed.

**Art plan (designer, Round 61):** develop the **base character art first** (the 15 base-form monsters and the player character), then use **placeholders** wherever art isn't ready yet (evolved forms, Avatar, tiles, items). Swap in the designer's drawings as they come in.
## Color palette
**Owner (2026-11-21):** lean toward **playful primary colors** with a **cohesive theme per area** (each biome and Ansonville keeps its own family of colors). The owner chose the palette rows in `Art-Mockups.html`, including the brighter Desert, Snowy and Volcano rows, over the first M3 placeholder colors in `src/data/maps/index.ts`.

## Size and scale
**Owner (2026-11-21):**
- "N x Dumble" means **every dimension**: a 2x monster is twice as wide and twice as tall (uniform scale), not just taller.
- In **battle**, sizes are compressed so a 10x Avatar fits on screen next to a 1x Dumble: both scale down, Dumble included, while bigger monsters still look bigger. The exact rule is proposed in `Art-Mockups.html`.
- **Battle size rule OK'd (owner, 2026-11-22, for now):** `clamp(72·√N, 56, 240)` px, N = size in Dumbles (`battleSpriteSize` in `src/logic/battleUi.ts`).

## Interim sprite style
**Vector** (owner, 2026-11-21), chosen over pixel art after comparing Peggy both ways in `Art-Mockups.html`. Sprites are smooth vector shapes until the designer's drawings arrive.

**Each monster looks different (owner, 2026-11-22).** Placeholders must not be one color per biome. Each monster gets its own body color, accent color and markings (spots, stripes, a belly patch, a mask), stored in `src/data/monsters.json`, while keeping its biome's theme. Snowy example: different whites and off-whites, spots and markings like real animals; a penguin-colored (black and white) one is fine. The drawing code lives in `src/ui/monsterArt.ts`.

**How it's stored (2026-11-22):** each monster in `src/data/monsters.json` has `art: { body, accent, markings }` (colors as `#rrggbb`; markings one of `none`, `spots`, `stripes`, `belly`, `mask`, `patch`, `tux`, `crown`, `segments`; `segments` adds `extra` colors, used for Avatar's five-element body). Zod checks it, and `tests/unit/data/art.test.ts` makes sure no two monsters in a biome share a body color. The map colors in `src/data/maps/index.ts` now use the brighter Desert, Snowy and Volcano rows from `Art-Mockups.html`.

## Vector sprites (M8, 2026-11-22)
- **Built:** every monster (the 15 base forms, the 15 evolved forms and Avatar), the player and Papai are vector sprites, one SVG file each, in `src/assets/sprites/`. They show in battle, the Team and Backpack screen, the Monster Book, the evolution screen, the map (player and Papai) and Ask Papai.
- **The 15 base monsters, Avatar, the player and Papai are the approved mockup drawings** from `Art-Mockups.html`, copied as they are. The **15 evolved forms are new**, drawn from each monster's "Look" line in the same style and colors as their first form; they need the owner's (and the designer's) eye.
- Monsters face left (or the front); in battle the player's monster is mirrored to face the wild one. Sizes follow the rules above: a sprite's longest side is its "N x Dumble" box, `clamp(72·√N, 56, 240)` px in battle; Big Monsters are 1.25x with a star.
- A monster without a sprite file falls back to the look-data placeholder, so a new monster always shows something. The designer's drawings can replace any file later (same name).
- How to add or change one: `docs/developer-guide.md` "Vector sprites (M8)".
- **Items and map art (M8 round 2):** item pictures (cage, potion, Wake-Up Snack, map part, Teleport Pin, Magic Gem) from the approved section 6 icons, shown in the Shop, the Bag and the battle cage throw; on the map, the Shop and Reviver buildings, the 5 gates (open: the element sign; locked: gray, barred, padlock) and a tree per area (forest tree, palm, cactus, snowy pine, volcanic rock), from the approved Ansonville mockup. Files in `src/assets/sprites/items/` and `tiles/`. Not yet: ground tiles, the arena, the HUD icons.
- **The designer's drawings:** how to turn them into sprites is in `Designer-Drawings-How-To.md`.
- **Arena, water and battle effects (owner, 2026-11-23):** Avatar's arena on the map is now art from the approved arena look (five element pillars around a striped dome; a padlocked door while sealed, a glowing doorway once open: `tiles/arena-sealed.svg`, `arena-open.svg`). Water has little waves, foam along the shore and a slow shimmer; the Volcano's lava has dark crust and bright bubbles, and the Desert's quicksand has swirls. In battle each move sends an element-colored shot and bursts on the target (flames, splashes, snowflakes, rocks, leaves, or a "pow" star for moves with no element); Burned, Frozen and healing have their own effects, and the cage leaves a gold sparkle trail, bursts into gold stars on a catch and puffs apart when the monster breaks free (`src/ui/battleFx.ts`, shapes only, no image files).

## Reference images (links / files in this folder)
- `Art-Mockups.html`: placeholder art and proposals (all 15 base monsters, size lineup, Avatar, player character, guide Papai, Peggy vector vs. pixel, Ansonville, gates, arena, shop, Reviver and items, exploring and battle screens). **Approved by the owner (2026-11-21):** the palette, vector style, Papai's look, and the section 6 looks (Ansonville, gates, arena, shop, Reviver, items). Anything still tagged "mockup guess" or "proposed" needs an OK.
