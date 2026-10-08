import { STATE_VERSION, emptyStats, type GameState } from "../core/state";

const SAVE_KEY = "lunchbreak-civ:save";

export interface SaveData {
  savedAt: number;
  state: GameState;
  /** Real seconds of active play so far (excludes time with the tab hidden). */
  playSeconds: number;
}

export function saveGame(state: GameState, playSeconds: number, storage: Storage = localStorage): void {
  const data: SaveData = { savedAt: Date.now(), state, playSeconds };
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

/** Fills in fields added after a save was written, so older saves keep loading. */
function migrate(data: SaveData): SaveData {
  for (const p of data.state.players) p.stats ??= emptyStats();
  data.playSeconds ??= 0;
  return data;
}

export function loadGame(storage: Storage = localStorage): SaveData | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    if (data?.state?.version !== STATE_VERSION) return null;
    return migrate(data);
  } catch {
    return null;
  }
}

export function clearSave(storage: Storage = localStorage): void {
  storage.removeItem(SAVE_KEY);
}
