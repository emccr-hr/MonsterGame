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

## Reference images (links / files in this folder)
- `Art-Mockups.html`: placeholder art and proposals (all 15 base monsters, size lineup, Avatar, player character, guide Papai, Peggy vector vs. pixel, Ansonville, gates, arena, shop, Reviver and items, exploring and battle screens). **Approved by the owner (2026-11-21):** the palette, vector style, Papai's look, and the section 6 looks (Ansonville, gates, arena, shop, Reviver, items). Anything still tagged "mockup guess" or "proposed" needs an OK.
