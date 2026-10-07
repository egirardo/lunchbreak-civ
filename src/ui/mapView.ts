import { IMPROVEMENTS } from "../data/improvements";
import { TERRAIN } from "../data/terrain";
import { UNITS } from "../data/units";
import { tileIndex } from "../core/grid";
import { cityAt, getPlayer, tileYields, unitAt } from "../core/queries";
import { HUMAN_PLAYER, type GameState, type Player, type Tile } from "../core/state";
import { esc } from "./format";
import { IMPROVEMENT_GLYPH, TERRAIN_GLYPH, UNIT_GLYPH, sprite } from "./glyphs";
import type { UiState } from "./uiState";

export interface MapContext {
  s: GameState;
  ui: UiState;
  visible: boolean[];
  explored: boolean[];
  reach: Map<number, number>;
  targets: Set<number>;
  selectedUnitId: number | null;
}

export function tileId(x: number, y: number): string {
  return `tile-${x}-${y}`;
}

export function ownerBadge(p: Player): string {
  return `<span class="owner-badge pat-${esc(p.pattern)}" style="--pc:${esc(p.color)}" aria-hidden="true">${esc(p.name.charAt(0))}</span>`;
}

function borderClasses(s: GameState, x: number, y: number, tile: Tile): string {
  const sides: [string, number, number][] = [["bt", 0, -1], ["br", 1, 0], ["bb", 0, 1], ["bl", -1, 0]];
  return sides
    .filter(([, dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) return true;
      return s.tiles[tileIndex(s, nx, ny)]?.owner !== tile.owner;
    })
    .map(([cls]) => cls)
    .join(" ");
}

function describeTile(ctx: MapContext, x: number, y: number): string {
  const { s } = ctx;
  const i = tileIndex(s, x, y);
  const where = `Column ${x + 1}, row ${y + 1}.`;
  if (!ctx.explored[i]) return `${where} Unexplored.`;
  const tile = s.tiles[i];
  if (!tile) return where;
  const parts = [where, TERRAIN[tile.terrain].name + (tile.river ? " with river" : "") + "."];
  if (TERRAIN[tile.terrain].passable) {
    const y2 = tileYields(s, x, y);
    parts.push(`Yields ${y2.food} food, ${y2.production} production.`);
  }
  if (tile.improvement) parts.push(`${IMPROVEMENTS[tile.improvement].name}.`);
  if (tile.owner !== null) parts.push(`Territory of ${tile.owner === HUMAN_PLAYER ? "you" : getPlayer(s, tile.owner).name}.`);
  const city = cityAt(s, x, y);
  if (city) {
    const owner = city.owner === HUMAN_PLAYER ? "Your" : `${getPlayer(s, city.owner).name}'s`;
    parts.push(`${owner} city ${city.name}, population ${city.population}${city.isCapital ? ", capital" : ""}.`);
  }
  const unit = unitAt(s, x, y);
  if (unit && (ctx.visible[i] || unit.owner === HUMAN_PLAYER)) {
    const owner = unit.owner === HUMAN_PLAYER ? "Your" : `${getPlayer(s, unit.owner).name}'s`;
    const extra = unit.owner === HUMAN_PLAYER ? `, ${unit.movesLeft} moves left${unit.task ? ", working" : ""}` : `, strength ${UNITS[unit.type].strength}`;
    parts.push(`${owner} ${UNITS[unit.type].name}${extra}.`);
  }
  if (!ctx.visible[i]) parts.push("Not currently visible.");
  if (unit && unit.id === ctx.selectedUnitId) parts.push("Selected.");
  const cost = ctx.reach.get(i);
  if (cost !== undefined) parts.push(`Move here: ${cost} move${cost === 1 ? "" : "s"}.`);
  if (ctx.targets.has(i)) parts.push("Can attack.");
  return parts.join(" ");
}

function tileHtml(ctx: MapContext, x: number, y: number): string {
  const { s, ui } = ctx;
  const i = tileIndex(s, x, y);
  const tile = s.tiles[i];
  const isCursor = ui.cursor.x === x && ui.cursor.y === y;
  const label = esc(describeTile(ctx, x, y));
  const common = `role="gridcell" id="${tileId(x, y)}" data-x="${x}" data-y="${y}" aria-label="${label}" title="${label}" aria-selected="${isCursor}"`;
  if (!tile || !ctx.explored[i]) {
    return `<div ${common} class="tile unexplored${isCursor ? " cursor" : ""}"></div>`;
  }

  const visible = ctx.visible[i] ?? false;
  const classes = ["tile", `t-${tile.terrain}`];
  if (!visible) classes.push("fogged");
  if (isCursor) classes.push("cursor");
  if (ctx.reach.has(i)) classes.push("reach");
  if (ctx.targets.has(i)) classes.push("target");
  const pa = ui.pendingAttack;
  if (pa && pa.target.x === x && pa.target.y === y) classes.push("pending");

  const layers: string[] = [];
  layers.push(`<div class="layer terrain">${sprite(`terrain:${tile.terrain}`, TERRAIN_GLYPH[tile.terrain], "terrain-glyph")}</div>`);
  if (tile.river) layers.push(`<div class="layer river">${sprite("overlay:river", "")}</div>`);
  if (tile.owner !== null) {
    const p = getPlayer(s, tile.owner);
    layers.push(`<div class="layer territory pat-${esc(p.pattern)} ${borderClasses(s, x, y, tile)}" style="--pc:${esc(p.color)}"></div>`);
  }
  if (tile.improvement) layers.push(`<div class="improvement">${sprite(`improvement:${tile.improvement}`, IMPROVEMENT_GLYPH[tile.improvement])}</div>`);

  const city = cityAt(s, x, y);
  if (city) {
    const p = getPlayer(s, city.owner);
    const key = city.isCapital ? "city:capital" : city.population >= 4 ? "city:large" : "city:small";
    layers.push(
      `<div class="city">${sprite(key, "🏛️", "", p.color)}</div>` +
        `<span class="city-label" style="--pc:${esc(p.color)}">${city.isCapital ? "★" : ""}${esc(city.name)} <b>${city.population}</b></span>`,
    );
  }

  const unit = unitAt(s, x, y);
  if (unit && (visible || unit.owner === HUMAN_PLAYER)) {
    const p = getPlayer(s, unit.owner);
    const unitClasses = ["unit"];
    if (city) unitClasses.push("in-city");
    if (unit.id === ctx.selectedUnitId) unitClasses.push("selected");
    if (unit.owner === HUMAN_PLAYER && (unit.movesLeft === 0 || unit.skipped)) unitClasses.push("spent");
    layers.push(
      `<div class="${unitClasses.join(" ")}">${sprite(`unit:${unit.type}`, UNIT_GLYPH[unit.type], "", p.color)}${ownerBadge(p)}` +
        `${unit.task ? '<span class="task" aria-hidden="true">…</span>' : ""}</div>`,
    );
  }

  return `<div ${common} class="${classes.join(" ")}">${layers.join("")}</div>`;
}

export function renderMap(ctx: MapContext): string {
  const rows: string[] = [];
  for (let y = 0; y < ctx.s.height; y++) {
    const cells: string[] = [];
    for (let x = 0; x < ctx.s.width; x++) cells.push(tileHtml(ctx, x, y));
    rows.push(`<div role="row" class="row">${cells.join("")}</div>`);
  }
  return rows.join("");
}
