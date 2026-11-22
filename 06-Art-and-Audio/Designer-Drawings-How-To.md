# Turning the designer's drawings into game sprites

The designer's own drawings replace the placeholder art whenever he's ready (Round 61, Art-Direction.md).
Each sprite is one SVG file, found by its name, so swapping a drawing in needs **no code**:
`src/assets/sprites/monsters/<monster id>.svg` (for example `peggy.svg`), `characters/`, `items/` or `tiles/`.

## 1. Draw
- One monster per sheet of plain white paper, big (fill most of the page).
- Dark marker or pen outlines (black felt-tip works best), then color inside with markers or crayons.
- The monster **faces left** (or straight at you). The game mirrors it when it's on the player's side.
- Leave a little white space around it. Write the monster's name on the back, not the front.

## 2. Scan or photograph
- A scanner at 300 dpi is best. A phone photo works too: daylight, no shadow, phone held flat above the page.
- Save as PNG or JPG, named after the monster (`peggy.png`).

## 3. Clean up (any free editor works; Inkscape is free and does steps 3 and 4)
- Crop to the monster with a small margin, and straighten it.
- Make the paper pure white: raise brightness and contrast until the background is clean.
- Erase smudges and stray lines. Keep the designer's lines and colors as they are: it's his art.

## 4. Turn it into vector art (SVG)
- **Inkscape:** File → Import the PNG, then Path → Trace Bitmap, pick **Multicolor** (about 8 to 16 colors),
  tick "Remove background", click Apply. Delete the original picture underneath, then keep only the traced shapes.
- Make the page fit the drawing: Edit → Resize Page to Selection. A **square** page matches the other monsters
  (the monster fills the square box that "N x Dumble" scales).
- Simplify a little if the file is huge (Path → Simplify, Ctrl+L); aim for under 200 KB.

## 5. Save it where the game finds it
- File → Save As → **Plain SVG**, named exactly like the monster's id: `src/assets/sprites/monsters/peggy.svg`.
  The id is the `id` in `src/data/monsters.json` (lowercase with dashes, such as `queen-ant`).
- The file needs a `viewBox` and the SVG `xmlns`, and no embedded pictures, scripts or links to other files.
  The unit test `tests/unit/ui/sprites.test.ts` checks this and tells you what to fix.
- Keep the old file: move it to `docs/archive/sprites/` with a one-line README (archive, don't delete).

## 6. Check it
- `npm run dev`, then open `/tools/sprite-gallery.html` to see every sprite side by side, and play a battle.
- `npm run ci:local -- --full`, then a PR with a screenshot of the new drawing in the game.
- Show the designer! Ask him (with the `design-buddy` skill) if it looks right, and record his words in `00-Raw-Input/`.

## Tips
- Big monsters don't need a bigger drawing: the game scales every sprite to its size from `scale` in monsters.json.
- If a traced drawing looks blotchy when small (the Monster Book shows it at about 46 px), use fewer colors in the trace.
- Original only (Flags N1, N2): his own monsters, not drawings of monsters from games or shows.
