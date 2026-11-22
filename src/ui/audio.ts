// Plays the original music and sound effects in src/data/audio.json with Web Audio (M8): small
// oscillator "chiptune" voices, no audio files. Browsers only allow sound after a key press or
// click, so the first one unlocks it. The Sound setting (Off, Low, Medium, High) is saved in
// localStorage and changed from the M menu.
import audioJson from '../data/audio.json';
import { audioFile, type SoundEffect } from '../data/schema';
import { nextVolume, parsePattern, readVolume, stepSeconds, VOLUME_LEVELS, type NoteEvent } from '../logic/music';

const audio = audioFile.parse(audioJson);
const VOLUME_KEY = 'magic-and-monsters.sound';

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let volume = readVolume(safeGet(VOLUME_KEY));

function safeGet(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function context(): AudioContext | undefined {
  if (ctx || typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return ctx;
  ctx = new window.AudioContext();
  master = ctx.createGain();
  master.gain.value = VOLUME_LEVELS[volume]!.gain;
  master.connect(ctx.destination);
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => void context()?.resume();
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
}

/** One note with a soft start and end so it doesn't click. */
function tone(freq: number, start: number, seconds: number, wave: OscillatorType, gain: number): void {
  const c = context();
  if (!c || !master) return;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  const end = start + Math.max(0.05, seconds * 0.9);
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + 0.01);
  env.gain.setValueAtTime(gain, Math.max(start + 0.01, end - 0.04));
  env.gain.linearRampToValueAtTime(0, end);
  osc.connect(env).connect(master);
  osc.start(start);
  osc.stop(end + 0.02);
}

// ---- Music: one song at a time, looping, scheduled a little ahead of time.
interface Voice {
  byStep: Map<number, NoteEvent[]>;
  wave: OscillatorType;
  gain: number;
}
let playing: { id: string; voices: Voice[]; steps: number; step: number; at: number; secs: number; timer: number } | undefined;

const voice = (text: string, wave: OscillatorType, gain: number): { v: Voice; steps: number } => {
  const p = parsePattern(text);
  const byStep = new Map<number, NoteEvent[]>();
  for (const n of p.notes) byStep.set(n.step, [...(byStep.get(n.step) ?? []), n]);
  return { v: { byStep, wave, gain }, steps: p.steps };
};

function schedule(): void {
  const c = ctx;
  if (!playing || !c) return;
  while (playing.at < c.currentTime + 0.25) {
    if (volume > 0) {
      const s = playing.step % playing.steps;
      for (const v of playing.voices) for (const n of v.byStep.get(s) ?? []) tone(n.freq, playing.at, n.length * playing.secs, v.wave, v.gain);
    }
    playing.step += 1;
    playing.at += playing.secs;
  }
}

/** Plays an area's song ("ansonville", a biome id or "battle"); the same song keeps going. */
export function playMusic(id: string): void {
  if (playing?.id === id) return;
  stopMusic();
  const song = audio.songs[id];
  const c = context();
  if (!song || !c) return;
  const melody = voice(song.melody, song.melodyWave, song.melodyGain);
  const bass = voice(song.bass, song.bassWave, song.bassGain);
  playing = {
    id,
    voices: [melody.v, bass.v],
    steps: Math.max(melody.steps, bass.steps),
    step: 0,
    at: c.currentTime + 0.05,
    secs: stepSeconds(song.tempo),
    timer: window.setInterval(schedule, 60),
  };
}

export function stopMusic(): void {
  if (playing) window.clearInterval(playing.timer);
  playing = undefined;
}

/** The song playing now (for the test hook), or null. */
export const currentMusic = (): string | null => playing?.id ?? null;

/** Plays a sound effect: "cage-throw", "catch", "break-free", "level-up", "evolve". */
export function playSfx(id: string): void {
  const fx: SoundEffect | undefined = audio.sfx[id];
  const c = context();
  if (!fx || !c || volume === 0) return;
  for (const n of parsePattern(fx.notes).notes) tone(n.freq, c.currentTime + 0.02 + n.step * fx.step, n.length * fx.step, fx.wave, fx.gain);
}

// ---- The Sound setting.
export const soundLabel = (): string => `Sound: ${VOLUME_LEVELS[volume]!.name}`;

/** Off → Low → Medium → High → Off. Saves it and returns the new label. */
export function cycleVolume(): string {
  volume = nextVolume(volume);
  if (master && ctx) master.gain.setValueAtTime(VOLUME_LEVELS[volume]!.gain, ctx.currentTime);
  try {
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Storage blocked: the setting lasts until the page reloads.
  }
  return soundLabel();
}
