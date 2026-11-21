# Tech Notes

See `09-Production/Development-Plan.md` and `docs/decisions/` for the full picture.

- **Engine:** Phaser 4 + TypeScript + Vite (ADR 0001). Maps from Tiled (JSON).
- **Platform:** desktop browsers (Chrome, Edge, Firefox, Safari), keyboard + mouse. Target 60 fps on a normal family laptop.
- **Rules** in `src/logic/` with no Phaser imports (ADR 0002). **Content** in `src/data/*.json` with Zod validation (ADR 0003).
- **Save:** `localStorage`, autosave on entering an area, after a catch, and after a battle; versioned save data; export/import as a file.
- **No live AI or API keys** in the game (ADR 0004).
- **Testing and CI:** `docs/ci-standards.md` (ADR 0005).
- **Deploy:** static site on release tags (ADR 0006).
