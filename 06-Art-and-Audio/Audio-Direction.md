# Audio Direction

*Music feel per biome is the designer's choice. These are starting suggestions.*

| Place | Suggested feel |
|---|---|
| Ansonville | Warm, friendly town tune |
| Forest | Light, bouncy, birdsong |
| Beach | Breezy, steel-drum or ukulele |
| Desert | Slow, mysterious |
| Snowy | Twinkly, calm, bells |
| Volcano | Low drums, rumbling |
| Battle | Upbeat loop |
| Avatar battle | Big and dramatic |

**Sound effects:** cage throw (whoosh), cage grow (pop), wobble, catch (ding), break free, hit, level up, evolve, buy, Reviver heal.
**Rules:** original or properly licensed (royalty-free with license recorded in `Audio-Credits.md`), volume and mute in Settings.

## Built (M8, 2026-11-22)
- **Original chiptune-style music for every area** (Ansonville, the 5 biomes, battles, and the Avatar battle for M6b), written as notes in `src/data/audio.json` and played by a small synth in the game (`src/ui/audio.ts`). No audio files, so nothing to license (`Audio-Credits.md`).
- Feel follows the table above where a synth can: Forest light and bouncy, Beach breezy (soft sine), Desert slow and mysterious (minor), Snowy calm and twinkly (slow, high notes), Volcano low and driving, Battle fast and upbeat, Avatar big and dramatic.
- **Sound effects:** cage throw, catch, break free, level up, evolve. Not yet: cage grow, wobble, hit, buy, Reviver heal.
- **Sound setting:** M menu → **Sound: Off / Low / Medium / High** (Enter changes it; Off is mute). Saved in the browser. Papai answers "How do I turn the sound down?".
- The designer still picks the music feel per biome (his choice, above); the songs are easy to rewrite in `audio.json`.
