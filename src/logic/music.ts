// Music and sound effects as notes (M8, src/data/audio.json). Plain TypeScript, no browser audio:
// this turns note strings into timed notes; src/ui/audio.ts plays them with Web Audio.

/** One note to play: start step, length in steps, frequency in Hz. */
export interface NoteEvent {
  step: number;
  length: number;
  freq: number;
}

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 440, "C5" → 523.25, "F#3", "Bb2". Undefined for anything that isn't a note. */
export function noteFrequency(name: string): number | undefined {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return undefined;
  const [, letter, accidental, octave] = m;
  const semis = SEMITONES[letter!]! + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  const midi = 12 * (Number(octave) + 1) + semis; // C4 = 60, A4 = 69
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface Pattern {
  notes: NoteEvent[];
  /** Number of steps, so a song loops cleanly. */
  steps: number;
  /** Tokens that are not a note, "-" or "_" (empty when the pattern is fine). */
  bad: string[];
}

/** Reads "C5 E5 _ - G5": a note starts a step, "_" holds the note before, "-" is a rest. */
export function parsePattern(text: string): Pattern {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const notes: NoteEvent[] = [];
  const bad: string[] = [];
  let last: NoteEvent | undefined;
  tokens.forEach((t, step) => {
    if (t === '-') {
      last = undefined;
    } else if (t === '_') {
      if (last) last.length += 1;
    } else {
      const freq = noteFrequency(t);
      if (freq === undefined) {
        bad.push(t);
        last = undefined;
      } else {
        last = { step, length: 1, freq };
        notes.push(last);
      }
    }
  });
  return { notes, steps: tokens.length, bad };
}

/** Seconds per step at a tempo, where each step is an eighth note. */
export const stepSeconds = (tempo: number): number => 60 / tempo / 2;

/** Volume levels for the Sound setting, quietest first; 0 is "Off" (mute). */
export const VOLUME_LEVELS = [
  { name: 'Off', gain: 0 },
  { name: 'Low', gain: 0.25 },
  { name: 'Medium', gain: 0.55 },
  { name: 'High', gain: 1 },
] as const;
export const DEFAULT_VOLUME = 2;

/** The next Sound setting after `level`, wrapping from High back to Off. */
export const nextVolume = (level: number): number => (level + 1) % VOLUME_LEVELS.length;

/** A saved volume level, or the default if it's missing or broken. */
export function readVolume(saved: string | null): number {
  if (saved === null || !/^\d$/.test(saved)) return DEFAULT_VOLUME;
  const n = Number(saved);
  return Number.isInteger(n) && n >= 0 && n < VOLUME_LEVELS.length ? n : DEFAULT_VOLUME;
}
