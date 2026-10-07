import { STATE_VERSION, type GameState } from "../core/state";

const SAVE_KEY = "lunchbreak-civ:save";

export interface SaveData {
  savedAt: number;
  state: GameState;
}

export function saveGame(state: GameState, storage: Storage = localStorage): void {
  const data: SaveData = { savedAt: Date.now(), state };
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(storage: Storage = localStorage): SaveData | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    if (data?.state?.version !== STATE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave(storage: Storage = localStorage): void {
  storage.removeItem(SAVE_KEY);
}
