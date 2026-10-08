import type { Point } from "../core/grid";
import type { Difficulty, GameEvent } from "../core/state";

export type Modal = "start" | "chooseTech" | "tech" | "help" | "away" | "end" | null;

export interface PendingAttack {
  unitId: number;
  target: Point;
}

/** Everything the UI tracks that is not part of the saved game. */
export interface UiState {
  modal: Modal;
  /** Modal to return to when a stacked modal (help, tech) closes. */
  returnModal: Modal;
  difficulty: Difficulty;
  selectedUnitId: number | null;
  selectedCityId: number | null;
  cursor: Point;
  pendingAttack: PendingAttack | null;
  status: string;
  lastTurnEvents: GameEvent[];
  awayEvents: GameEvent[];
  savedAt: number | null;
  hasSave: boolean;
  /** Active play time, shown on the end screen. */
  playSeconds: number;
  summaryCopied: boolean;
}

export function initialUiState(hasSave: boolean): UiState {
  return {
    modal: "start",
    returnModal: null,
    difficulty: "normal",
    selectedUnitId: null,
    selectedCityId: null,
    cursor: { x: 0, y: 0 },
    pendingAttack: null,
    status: "",
    lastTurnEvents: [],
    awayEvents: [],
    savedAt: null,
    hasSave,
    playSeconds: 0,
    summaryCopied: false,
  };
}
