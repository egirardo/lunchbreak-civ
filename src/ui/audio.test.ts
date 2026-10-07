import { describe, expect, it } from "vitest";
import {
  MUSIC_ORDER,
  MUSIC_SECTIONS,
  SFX_PATTERNS,
  isMusicEnabled,
  isMuted,
  midiToFreq,
  playSfx,
  setMusicEnabled,
  setMuted,
  setVolume,
  startMusic,
  stopMusic,
  unlockAudio,
  type SfxName,
} from "./audio";

describe("audio", () => {
  it("converts MIDI to frequency", () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(midiToFreq(81)).toBeCloseTo(880);
  });

  it("keeps every sound effect short (50–1200ms total)", () => {
    for (const [name, notes] of Object.entries(SFX_PATTERNS)) {
      const end = Math.max(...notes.map((x) => x.start + x.duration));
      expect(end, name).toBeGreaterThanOrEqual(0.05);
      expect(end, name).toBeLessThanOrEqual(1.2);
    }
  });

  it("music sections are equal length so the loop stays in time", () => {
    const len = MUSIC_SECTIONS[0]?.melody.length;
    for (const s of MUSIC_SECTIONS) {
      expect(s.melody).toHaveLength(len ?? 0);
      expect(s.bass).toHaveLength(len ?? 0);
    }
    for (const i of MUSIC_ORDER) expect(MUSIC_SECTIONS[i]).toBeDefined();
  });

  it("never throws without an AudioContext or localStorage", () => {
    expect(() => {
      unlockAudio();
      for (const name of Object.keys(SFX_PATTERNS) as SfxName[]) playSfx(name);
      startMusic();
      setMuted(true);
      setMusicEnabled(false);
      setVolume(0.5);
      stopMusic();
    }).not.toThrow();
    expect(isMuted()).toBe(true);
    expect(isMusicEnabled()).toBe(false);
  });
});
