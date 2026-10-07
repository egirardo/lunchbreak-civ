import type { BuildingId } from "../data/buildings";
import type { ImprovementId } from "../data/improvements";
import type { TerrainId } from "../data/terrain";
import type { UnitTypeId } from "../data/units";
import { esc } from "./format";
import { spriteUrl, tintedSpriteUrl, type SpriteKey } from "./sprites";

export const TERRAIN_GLYPH: Record<TerrainId, string> = {
  grassland: "",
  forest: "🌲",
  hills: "⛰️",
  water: "≈",
  mountains: "🏔️",
};

export const UNIT_GLYPH: Record<UnitTypeId, string> = {
  settler: "⛺",
  warrior: "🗡️",
  archer: "🏹",
  horseman: "🐎",
  worker: "⚒️",
  swordsman: "⚔️",
};

export const IMPROVEMENT_GLYPH: Record<ImprovementId, string> = {
  farm: "🌾",
  mine: "⛏️",
};

export const BUILDING_GLYPH: Record<BuildingId, string> = {
  granary: "🌾",
  workshop: "⚙️",
  walls: "🧱",
  library: "📜",
  temple: "⛩️",
  university: "🎓",
};

export const ICON = {
  food: "🌾",
  production: "⚙️",
  science: "🔬",
  culture: "🎭",
  score: "🏆",
  time: "⏱️",
  strength: "💪",
  moves: "👣",
  capital: "★",
  city: "🏛️",
} as const;

/** Sprite if the art pack provides one, otherwise a glyph so the game is always playable. */
export function sprite(key: SpriteKey, fallback: string, cls = "", tint?: string): string {
  const url = tint ? tintedSpriteUrl(key, tint) : spriteUrl(key);
  if (url) return `<img class="sprite ${cls}" src="${esc(url)}" alt="" draggable="false">`;
  if (!fallback) return "";
  return `<span class="glyph ${cls}" aria-hidden="true">${fallback}</span>`;
}

/** Small inline icon for panels (yields etc.). */
export function icon(key: SpriteKey, fallback: string): string {
  return sprite(key, fallback, "icon");
}
