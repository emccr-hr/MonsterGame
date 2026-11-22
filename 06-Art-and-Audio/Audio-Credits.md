# Audio credits and licenses

Every sound in Magic and Monsters, where it came from, and its license. Add a row before adding any sound.

| Sound | Where it is | Source | License |
|---|---|---|---|
| Songs: Ansonville, Forest, Beach, Desert, Snowy, Volcano, Battle, Avatar battle | `src/data/audio.json` (`songs`) | **Original**, written for this game as notes (2026-11-22) and played by the game's own synth (`src/ui/audio.ts`) | Ours. No third-party audio. |
| Sound effects: cage throw, catch, break free, level up, evolve | `src/data/audio.json` (`sfx`) | **Original**, same as above | Ours. No third-party audio. |

No audio files are downloaded or bundled: the game builds every sound from oscillators at run time, so
there's nothing to license. If a recorded or royalty-free sound is ever added, put the file under
`public/assets/audio/`, add a row here with the exact source URL, author and license (CC0 or a
license that allows use in a free game), and keep a copy of the license text next to the file.
