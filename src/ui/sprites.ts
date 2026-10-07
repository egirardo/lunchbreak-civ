import type { TerrainId } from "../data/terrain";
import type { UnitTypeId } from "../data/units";
import type { BuildingId } from "../data/buildings";
import type { ImprovementId } from "../data/improvements";
import { PALETTE, SPRITES, SPRITE_SIZE, TINT_CHAR } from "./spriteData";

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

export const ALL_SPRITE_KEYS = Object.keys(SPRITES) as SpriteKey[];

const cache = new Map<string, string>();

/** Renders a pixel grid as a crisp SVG, merging horizontal runs of the same colour into one rect. */
function toSvgUrl(pixels: readonly string[], tint: string): string {
  const rects: string[] = [];
  pixels.forEach((line, y) => {
    let x = 0;
    while (x < line.length) {
      const ch = line[x] as string;
      let end = x + 1;
      while (end < line.length && line[end] === ch) end++;
      const color = ch === TINT_CHAR ? tint : PALETTE[ch];
      if (ch !== "." && color) rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${color}"/>`);
      x = end;
    }
  });
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}" ` +
    `width="${SPRITE_SIZE}" height="${SPRITE_SIZE}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function render(key: SpriteKey, tint: string): string | null {
  const cacheKey = `${key}|${tint}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const pixels = SPRITES[key];
  if (!pixels) return null;
  const url = toSvgUrl(pixels, tint);
  cache.set(cacheKey, url);
  return url;
}

export function spriteUrl(key: SpriteKey): string | null {
  return render(key, PALETTE[TINT_CHAR] ?? "#e8e4d8");
}

/**
 * Same sprite with its team-colour pixels (unit tunics, swordsman crest/shield stripe,
 * capital flag) painted in the given CSS colour. Sprites without team pixels are unchanged.
 */
export function tintedSpriteUrl(key: SpriteKey, color: string): string | null {
  return render(key, color);
}
