/**
 * Contract between the audio system and the UI. All sound is synthesized with the Web Audio API.
 * Every function must be safe to call before any user gesture (it should no-op until unlocked).
 */
export type SfxName =
  | "select"
  | "move"
  | "attackWin"
  | "attackLose"
  | "cityFounded"
  | "built"
  | "tech"
  | "endTurn"
  | "victory"
  | "defeat"
  | "error";

type Wave = "square" | "triangle" | "sawtooth" | "sine" | "noise";

export interface SfxNote {
  /** MIDI note number; ignored for noise. */
  midi: number;
  /** Seconds from the start of the effect. */
  start: number;
  duration: number;
  wave: Wave;
  volume: number;
  /** Optional pitch glide target (MIDI) over the note's duration. */
  slideTo?: number;
}

const n = (midi: number, start: number, duration: number, wave: Wave, volume = 0.5, slideTo?: number): SfxNote =>
  slideTo === undefined ? { midi, start, duration, wave, volume } : { midi, start, duration, wave, volume, slideTo };

export const SFX_PATTERNS: Record<SfxName, SfxNote[]> = {
  select: [n(84, 0, 0.05, "square", 0.25)],
  move: [n(60, 0, 0.08, "triangle", 0.5, 67)],
  attackWin: [n(0, 0, 0.12, "noise", 0.35), n(67, 0.06, 0.08, "square", 0.3), n(72, 0.14, 0.14, "square", 0.3)],
  attackLose: [n(0, 0, 0.15, "noise", 0.35), n(60, 0.08, 0.25, "square", 0.3, 48)],
  cityFounded: [n(60, 0, 0.1, "triangle", 0.6), n(64, 0.1, 0.1, "triangle", 0.6), n(67, 0.2, 0.1, "triangle", 0.6), n(72, 0.3, 0.25, "triangle", 0.6)],
  built: [n(72, 0, 0.07, "square", 0.25), n(79, 0.08, 0.12, "square", 0.25)],
  tech: [n(76, 0, 0.08, "triangle", 0.5), n(79, 0.08, 0.08, "triangle", 0.5), n(84, 0.16, 0.08, "triangle", 0.5), n(88, 0.24, 0.3, "triangle", 0.45)],
  endTurn: [n(67, 0, 0.08, "triangle", 0.45), n(60, 0.09, 0.14, "triangle", 0.45)],
  victory: [
    n(60, 0, 0.12, "square", 0.3), n(64, 0.12, 0.12, "square", 0.3), n(67, 0.24, 0.12, "square", 0.3),
    n(72, 0.36, 0.2, "square", 0.3), n(67, 0.56, 0.1, "square", 0.3), n(72, 0.66, 0.5, "square", 0.3),
    n(48, 0, 0.36, "triangle", 0.5), n(55, 0.36, 0.3, "triangle", 0.5), n(48, 0.66, 0.5, "triangle", 0.5),
  ],
  defeat: [
    n(67, 0, 0.2, "triangle", 0.5), n(63, 0.2, 0.2, "triangle", 0.5), n(60, 0.4, 0.2, "triangle", 0.5),
    n(55, 0.6, 0.55, "triangle", 0.5, 53), n(43, 0, 0.6, "triangle", 0.35), n(36, 0.6, 0.55, "triangle", 0.35),
  ],
  error: [n(50, 0, 0.07, "square", 0.2), n(47, 0.09, 0.1, "square", 0.2)],
};

/** One music section: melody and bass as MIDI per eighth note; null is a rest. */
export interface MusicSection {
  melody: (number | null)[];
  bass: (number | null)[];
}

// Calm C-major / A-minor loop. Three sections so it doesn't grate over a 20-minute game.
export const MUSIC_SECTIONS: MusicSection[] = [
  {
    melody: [72, null, 76, null, 79, null, 76, null, 74, null, 72, null, 67, null, null, null,
      69, null, 72, null, 76, null, 74, null, 72, null, null, null, null, null, null, null],
    bass: [48, null, null, null, 55, null, null, null, 53, null, null, null, 55, null, null, null,
      45, null, null, null, 52, null, null, null, 53, null, null, null, 55, null, null, null],
  },
  {
    melody: [69, null, 72, 74, 76, null, 74, null, 72, null, 69, null, 67, null, null, null,
      65, null, 69, null, 72, null, 71, null, 67, null, null, null, null, null, null, null],
    bass: [45, null, null, null, 52, null, null, null, 41, null, null, null, 48, null, null, null,
      41, null, null, null, 48, null, null, null, 43, null, null, null, 50, null, null, null],
  },
  {
    melody: [null, null, 79, null, 77, null, 76, null, 74, null, null, null, 72, null, 74, null,
      76, null, null, null, 74, null, 72, null, 72, null, null, null, null, null, null, null],
    bass: [41, null, null, null, 48, null, null, null, 43, null, null, null, 50, null, null, null,
      48, null, null, null, 43, null, null, null, 48, null, null, null, null, null, null, null],
  },
];

/** Order sections are played in; repeats the opening theme so the loop feels familiar. */
export const MUSIC_ORDER = [0, 1, 0, 2];
const TEMPO_BPM = 84;
const EIGHTH = 60 / TEMPO_BPM / 2;

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ---------- preferences ----------

const PREF_MUTED = "lunchbreak-civ:audio-muted";
const PREF_MUSIC = "lunchbreak-civ:music-enabled";
const PREF_VOLUME = "lunchbreak-civ:volume";

function readPref(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    // Storage may be full or blocked; preferences are optional.
  }
}

let mutedPref: boolean | null = null;
let musicPref: boolean | null = null;
let volumePref: number | null = null;

// ---------- audio graph ----------

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  music: GainNode;
  noise: AudioBuffer;
}

let graph: Graph | null = null;
let musicWanted = false;
let musicTimer: ReturnType<typeof setTimeout> | null = null;
let musicStep = 0;
let musicNextTime = 0;
const musicVoices = new Set<AudioScheduledSourceNode>();

const SFX_LEVEL = 0.5;
const MUSIC_LEVEL = 0.12;
const LOOKAHEAD_S = 0.4;
const SCHEDULER_MS = 100;

function audioContextCtor(): (new () => AudioContext) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function buildGraph(): Graph | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  const music = ctx.createGain();
  master.gain.value = isMuted() ? 0 : getVolume();
  sfx.gain.value = SFX_LEVEL;
  music.gain.value = MUSIC_LEVEL;
  sfx.connect(master);
  music.connect(master);
  master.connect(ctx.destination);

  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  return { ctx, master, sfx, music, noise };
}

function ready(): Graph | null {
  return graph && graph.ctx.state === "running" ? graph : null;
}

function playVoice(g: Graph, dest: AudioNode, wave: Wave, midi: number, when: number, duration: number, volume: number, slideTo?: number): AudioScheduledSourceNode {
  const env = g.ctx.createGain();
  const attack = Math.min(0.01, duration / 4);
  const release = Math.min(0.06, duration / 2);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(volume, when + attack);
  env.gain.setValueAtTime(volume, when + duration - release);
  env.gain.linearRampToValueAtTime(0, when + duration);
  env.connect(dest);

  let src: AudioScheduledSourceNode;
  if (wave === "noise") {
    const b = g.ctx.createBufferSource();
    b.buffer = g.noise;
    const filter = g.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    b.connect(filter);
    filter.connect(env);
    src = b;
  } else {
    const osc = g.ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(midiToFreq(midi), when);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(midiToFreq(slideTo), when + duration);
    osc.connect(env);
    src = osc;
  }
  src.start(when);
  src.stop(when + duration + 0.02);
  src.onended = () => env.disconnect();
  return src;
}

// ---------- public API ----------

export function unlockAudio(): void {
  try {
    if (!graph) graph = buildGraph();
    if (graph && graph.ctx.state === "suspended") {
      void graph.ctx.resume().then(() => {
        if (musicWanted) scheduleMusic();
      }).catch(() => undefined);
    } else if (musicWanted) {
      scheduleMusic();
    }
  } catch {
    graph = null;
  }
}

export function playSfx(name: SfxName): void {
  try {
    const g = ready();
    if (!g || isMuted()) return;
    const t0 = g.ctx.currentTime + 0.01;
    for (const note of SFX_PATTERNS[name]) {
      playVoice(g, g.sfx, note.wave, note.midi, t0 + note.start, note.duration, note.volume, note.slideTo);
    }
  } catch {
    // Sound is never allowed to break the game.
  }
}

function scheduleMusic(): void {
  const g = ready();
  if (!g || !musicWanted || !isMusicEnabled()) return;
  if (musicTimer !== null) return;
  musicNextTime = g.ctx.currentTime + 0.1;
  const tick = () => {
    try {
      const cur = ready();
      if (!cur || !musicWanted || !isMusicEnabled()) {
        musicTimer = null;
        return;
      }
      while (musicNextTime < cur.ctx.currentTime + LOOKAHEAD_S) {
        scheduleMusicStep(cur, musicStep, musicNextTime);
        musicStep++;
        musicNextTime += EIGHTH;
      }
      musicTimer = setTimeout(tick, SCHEDULER_MS);
    } catch {
      musicTimer = null;
    }
  };
  tick();
}

function scheduleMusicStep(g: Graph, step: number, when: number): void {
  const sectionLength = MUSIC_SECTIONS[0]?.melody.length ?? 32;
  const sectionIndex = MUSIC_ORDER[Math.floor(step / sectionLength) % MUSIC_ORDER.length] ?? 0;
  const section = MUSIC_SECTIONS[sectionIndex];
  if (!section) return;
  const i = step % sectionLength;
  const track = (notes: (number | null)[], wave: Wave, volume: number, holdMax: number) => {
    const midi = notes[i];
    if (midi === null || midi === undefined) return;
    let len = 1;
    while (len < holdMax && notes[(i + len) % notes.length] === null) len++;
    const voice = playVoice(g, g.music, wave, midi, when, len * EIGHTH * 0.95, volume);
    musicVoices.add(voice);
    voice.addEventListener("ended", () => musicVoices.delete(voice));
  };
  track(section.melody, "triangle", 0.5, 4);
  track(section.bass, "triangle", 0.6, 4);
}

export function startMusic(): void {
  musicWanted = true;
  try {
    scheduleMusic();
  } catch {
    // ignore
  }
}

export function stopMusic(): void {
  musicWanted = false;
  if (musicTimer !== null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  musicStep = 0;
  const g = graph;
  for (const v of musicVoices) {
    try {
      v.stop(g ? g.ctx.currentTime + 0.05 : 0);
    } catch {
      // already stopped
    }
  }
  musicVoices.clear();
}

export function setMuted(muted: boolean): void {
  mutedPref = muted;
  writePref(PREF_MUTED, muted ? "1" : "0");
  applyMaster();
}

export function isMuted(): boolean {
  if (mutedPref === null) mutedPref = readPref(PREF_MUTED) === "1";
  return mutedPref;
}

export function setMusicEnabled(enabled: boolean): void {
  musicPref = enabled;
  writePref(PREF_MUSIC, enabled ? "1" : "0");
  if (!enabled) {
    const wanted = musicWanted;
    stopMusic();
    musicWanted = wanted;
  } else if (musicWanted) {
    try {
      scheduleMusic();
    } catch {
      // ignore
    }
  }
}

export function isMusicEnabled(): boolean {
  if (musicPref === null) musicPref = readPref(PREF_MUSIC) !== "0";
  return musicPref;
}

/** Master volume, 0..1. */
export function setVolume(volume: number): void {
  volumePref = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0.8));
  writePref(PREF_VOLUME, String(volumePref));
  applyMaster();
}

export function getVolume(): number {
  if (volumePref === null) {
    const raw = Number(readPref(PREF_VOLUME));
    volumePref = readPref(PREF_VOLUME) !== null && Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.8;
  }
  return volumePref;
}

function applyMaster(): void {
  try {
    if (!graph) return;
    const target = isMuted() ? 0 : getVolume();
    graph.master.gain.setTargetAtTime(target, graph.ctx.currentTime, 0.02);
  } catch {
    // ignore
  }
}
