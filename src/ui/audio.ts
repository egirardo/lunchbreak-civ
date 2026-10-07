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

export function unlockAudio(): void {}
export function playSfx(_name: SfxName): void {}
export function startMusic(): void {}
export function stopMusic(): void {}
export function setMuted(_muted: boolean): void {}
export function isMuted(): boolean {
  return false;
}
export function setMusicEnabled(_enabled: boolean): void {}
export function isMusicEnabled(): boolean {
  return true;
}
