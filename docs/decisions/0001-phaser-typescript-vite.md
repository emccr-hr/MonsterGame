# 0001: Phaser 4 + TypeScript + Vite for a browser game

**Decided 2026-11-21.**
- **Engine:** Phaser 4. The 2026-11-21 research reported v4.2.1 as current stable; **check the latest stable version at setup** and pin an exact version. It has built-in scenes, tilemaps, sprites, input and tweens, the largest set of docs, and good AI familiarity. Code written for Phaser 3-style sprites and tilemaps mostly carries over.
- **Language:** TypeScript (strict). **Build:** Vite. **Maps:** Tiled, exported as JSON.
- **Tests:** Vitest (logic), Playwright (a small smoke suite).
- **Ruled out:** KAPLAY (good for jams, slower and thinner for a 30-monster game); Excalibur (fewer built-ins); PixiJS and plain canvas (we'd have to build scenes, input and tilemaps ourselves).
