// M8 audio: note strings → timed notes, the Sound setting, and every song and sound in audio.json.
import { describe, expect, it } from 'vitest';
import audioJson from '../../../src/data/audio.json';
import { audioFile } from '../../../src/data/schema';
import { DEFAULT_VOLUME, nextVolume, noteFrequency, parsePattern, readVolume, stepSeconds, VOLUME_LEVELS } from '../../../src/logic/music';
import { realContent } from '../helpers';

describe('notes', () => {
  it('turns note names into frequencies', () => {
    expect(noteFrequency('A4')).toBe(440);
    expect(noteFrequency('A5')).toBe(880);
    expect(noteFrequency('C4')).toBeCloseTo(261.63, 1);
    expect(noteFrequency('F#4')).toBeCloseTo(369.99, 1);
    expect(noteFrequency('Gb4')).toBeCloseTo(noteFrequency('F#4')!, 6);
    expect(noteFrequency('Bb2')).toBeCloseTo(116.54, 1);
    expect(noteFrequency('H4')).toBeUndefined();
    expect(noteFrequency('C')).toBeUndefined();
  });

  it('reads notes, holds and rests one step each', () => {
    const p = parsePattern('C5 _ _ - E5 G5 _');
    expect(p.steps).toBe(7);
    expect(p.bad).toEqual([]);
    expect(p.notes.map(({ step, length }) => [step, length])).toEqual([
      [0, 3],
      [4, 1],
      [5, 2],
    ]);
  });

  it('a hold after a rest does nothing, and bad tokens are reported', () => {
    const p = parsePattern('- _ X9 C4');
    expect(p.notes).toHaveLength(1);
    expect(p.notes[0]!.step).toBe(3);
    expect(p.bad).toEqual(['X9']);
  });

  it('a step is an eighth note', () => {
    expect(stepSeconds(120)).toBe(0.25);
  });
});

describe('the Sound setting', () => {
  it('goes Off, Low, Medium, High and back to Off', () => {
    expect(VOLUME_LEVELS.map((v) => v.name)).toEqual(['Off', 'Low', 'Medium', 'High']);
    expect(VOLUME_LEVELS[0].gain).toBe(0);
    expect(nextVolume(3)).toBe(0);
    expect(nextVolume(0)).toBe(1);
  });

  it('reads a saved level, or uses the default for anything broken', () => {
    expect(readVolume('0')).toBe(0);
    expect(readVolume('3')).toBe(3);
    for (const bad of [null, '', '7', '-1', '1.5', 'loud']) expect(readVolume(bad)).toBe(DEFAULT_VOLUME);
  });
});

describe('audio.json', () => {
  const audio = audioFile.parse(audioJson);
  const content = realContent();

  it('has a song for Ansonville, every biome and battles', () => {
    for (const id of ['ansonville', 'battle', ...content.biomes.map((b) => b.id)]) expect(audio.songs[id], id).toBeDefined();
  });

  it('every song parses, and its melody and bass are the same length so it loops cleanly', () => {
    for (const [id, s] of Object.entries(audio.songs)) {
      const melody = parsePattern(s.melody);
      const bass = parsePattern(s.bass);
      expect(melody.bad, `${id} melody`).toEqual([]);
      expect(bass.bad, `${id} bass`).toEqual([]);
      expect(melody.steps, id).toBe(bass.steps);
      expect(melody.notes.length, id).toBeGreaterThan(4);
    }
  });

  it('has the sound effects the scenes play, and they all parse', () => {
    for (const id of ['cage-throw', 'catch', 'break-free', 'level-up', 'evolve']) expect(audio.sfx[id], id).toBeDefined();
    for (const [id, fx] of Object.entries(audio.sfx)) expect(parsePattern(fx.notes).bad, id).toEqual([]);
  });

  it('rejects a bad wave or tempo', () => {
    const song = audio.songs.forest!;
    expect(audioFile.safeParse({ songs: { forest: { ...song, melodyWave: 'kazoo' } }, sfx: {} }).success).toBe(false);
    expect(audioFile.safeParse({ songs: { forest: { ...song, tempo: 999 } }, sfx: {} }).success).toBe(false);
  });
});
