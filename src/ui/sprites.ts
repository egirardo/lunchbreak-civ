import type { TerrainId } from "../data/terrain";
import type { UnitTypeId } from "../data/units";
import type { BuildingId } from "../data/buildings";
import type { ImprovementId } from "../data/improvements";

/**
 * Contract between the art and the UI. The UI asks for a sprite by key; if this returns null
 * the UI must fall back to a text/emoji glyph so the game stays playable without art.
 */
export type SpriteKey =
  | `terrain:${TerrainId}`
  | "overlay:river"
  | `improvement:${ImprovementId}`
  | `unit:${UnitTypeId}`
  | `building:${BuildingId}`
  | "city:small"
  | "city:large"
  | "city:capital"
  | "ui:food"
  | "ui:production"
  | "ui:science"
  | "ui:culture"
  | "ui:fog";

export function spriteUrl(_key: SpriteKey): string | null {
  return null;
}
