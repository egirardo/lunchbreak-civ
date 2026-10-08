import { BUILDINGS, type BuildingId } from "../data/buildings";
import { PLAYER_PRESETS, RULES } from "../data/config";
import { IMPROVEMENTS, type ImprovementId } from "../data/improvements";
import { TERRAIN, type TerrainId } from "../data/terrain";
import { UNITS, type UnitTypeId } from "../data/units";
import { esc } from "./format";
import { BUILDING_GLYPH, ICON, IMPROVEMENT_GLYPH, TERRAIN_GLYPH, UNIT_GLYPH, icon, sprite } from "./glyphs";

type Row = [symbol: string, meaning: string];

function table(caption: string, rows: Row[]): string {
  const body = rows.map(([sym, meaning]) => `<tr><td class="legend-sym">${sym}</td><td>${meaning}</td></tr>`).join("");
  return `<table class="legend"><caption>${caption}</caption><tbody>${body}</tbody></table>`;
}

const swatch = (cls: string, inner = ""): string => `<span class="legend-tile ${cls}" aria-hidden="true">${inner}</span>`;

/** A mini map tile: grassland underneath, then layers stacked on top, as the map draws them. */
const onGrass = (...layers: string[]): string =>
  swatch("grass", [sprite("terrain:grassland", "", "legend-layer"), ...layers.map((l) => `<span class="legend-over">${l}</span>`)].join(""));

function yieldsText(t: TerrainId): string {
  const def = TERRAIN[t];
  if (!def.passable) return "impassable, yields nothing";
  return `${def.yields.food} food, ${def.yields.production} production`;
}

/** Every symbol and visual cue used in play, drawn with the same sprites/glyphs the game uses. */
export function legendHtml(): string {
  const p0 = PLAYER_PRESETS[0];
  const stats: Row[] = [
    [icon("ui:food", ICON.food), "<strong>Food</strong>: grows city population (10 food = +1 population)"],
    [icon("ui:production", ICON.production), "<strong>Production</strong>: builds units and buildings"],
    [icon("ui:science", ICON.science), "<strong>Science</strong>: researches techs"],
    [icon("ui:culture", ICON.culture), `<strong>Culture</strong>: from Temples; ${RULES.cultureVictoryThreshold} wins a Culture Victory`],
    [ICON.score, "<strong>Score</strong> (victory points): highest score after turn 30 wins"],
    [ICON.time, "Estimated real time left in the game"],
    [ICON.strength, "<strong>Strength</strong>: higher wins a fight; ties go to the defender"],
    [ICON.moves, "<strong>Moves</strong> left this turn / moves per turn"],
  ];

  const terrain: Row[] = (Object.keys(TERRAIN) as TerrainId[]).map((t) => [
    sprite(`terrain:${t}`, TERRAIN_GLYPH[t] || "▢", "legend-sprite"),
    `<strong>${esc(TERRAIN[t].name)}</strong>: ${yieldsText(t)}`,
  ]);
  terrain.push([onGrass(sprite("overlay:river", "〰", "legend-layer")), "<strong>River</strong>: +1 food on that tile"]);
  for (const id of Object.keys(IMPROVEMENTS) as ImprovementId[]) {
    const b = IMPROVEMENTS[id].bonus;
    terrain.push([onGrass(sprite(`improvement:${id}`, IMPROVEMENT_GLYPH[id], "legend-layer")), `<strong>${esc(IMPROVEMENTS[id].name)}</strong>: +${b.food || b.production} ${b.food ? "food" : "production"} (built by a Worker)`]);
  }

  const units: Row[] = (Object.keys(UNITS) as UnitTypeId[]).map((u) => {
    const d = UNITS[u];
    const stats = [d.strength > 0 ? `${ICON.strength} ${d.strength}` : "no combat", `${ICON.moves} ${d.moves}`].join(" · ");
    return [sprite(`unit:${u}`, UNIT_GLYPH[u], "legend-sprite", p0.color), `<strong>${esc(d.name)}</strong> (${stats}): ${esc(d.description)}`];
  });

  const buildings: Row[] = (Object.keys(BUILDINGS) as BuildingId[]).map((b) => [
    sprite(`building:${b}`, BUILDING_GLYPH[b], "legend-sprite"),
    `<strong>${esc(BUILDINGS[b].name)}</strong>: ${esc(BUILDINGS[b].description)}`,
  ]);

  const badges = PLAYER_PRESETS.map(
    (p) => `<span class="owner-badge legend-badge pat-${esc(p.pattern)}" style="--pc:${esc(p.color)}" aria-hidden="true">${esc(p.name.charAt(0))}</span>`,
  ).join(" ");
  const map: Row[] = [
    [sprite("city:capital", ICON.city, "legend-sprite", p0.color), "A <strong>city</strong>. Its label shows ★ if it's a capital, then its name and population"],
    [badges, `<strong>Owner letter</strong> on units and cities: ${PLAYER_PRESETS.map((p) => esc(p.name)).join(", ")}. You are ${esc(p0.name)}`],
    [swatch(`territory pat-${esc(p0.pattern)}`, ""), "<strong>Territory</strong>: each empire has its own colour, border and pattern (stripes, dots, or checks)"],
    [onGrass(sprite("unit:warrior", UNIT_GLYPH.warrior, "legend-layer", p0.color), '<span class="orders-badge legend-flag">!</span>'), "Your unit still <strong>needs orders</strong> this turn"],
    [onGrass(sprite("unit:worker", UNIT_GLYPH.worker, "legend-layer", p0.color), '<span class="task legend-task">…</span>'), "A Worker is <strong>busy</strong> building an improvement"],
    [onGrass(`<span class="legend-spent">${sprite("unit:warrior", UNIT_GLYPH.warrior, "legend-layer", p0.color)}</span>`), "Faded unit: <strong>no moves left</strong> (or skipped) this turn"],
    [swatch("reach-swatch"), "White dashed tile: the selected unit <strong>can move here</strong>"],
    [swatch("target-swatch"), "Red striped tile: the selected unit <strong>can attack here</strong>"],
    [swatch("cursor-swatch"), "Yellow frame: the <strong>map cursor</strong> (move it with the arrow keys)"],
    [swatch("fog-swatch", sprite("terrain:grassland", "", "legend-sprite")), "Dimmed: explored but <strong>not currently visible</strong>; enemy units here are hidden"],
    [swatch("unexplored-swatch"), "Dark hatched: <strong>unexplored</strong>"],
  ];

  const panels: Row[] = [
    ["⚑", "How many of your units <strong>need orders</strong> this turn"],
    ["◀ ▶", "Flip between units that need orders (<kbd>P</kbd> / <kbd>N</kbd>)"],
    ["⚠", "<strong>Needs attention</strong>: no research chosen, or a city with nothing queued"],
    ['<span class="unread">2</span>', "On the Log tab: <strong>new events</strong> you haven't read yet"],
    ["✓", "Tech researched, or all units have orders"],
    ["▶", "Tech currently being researched"],
    ["🔒", "Tech locked: research its prerequisites first"],
    ["✝", "Player eliminated (lost their capital)"],
    ["✕", "Close the panel"],
    ["🔊 / 🔇", "Sound effects on / off"],
    ["♪", "Music on / off"],
  ];

  return [
    table("Stats and resources", stats),
    table("Terrain and improvements", terrain),
    table("Units", units),
    table("Buildings", buildings),
    table("On the map", map),
    table("Panels and buttons", panels),
  ].join("");
}
