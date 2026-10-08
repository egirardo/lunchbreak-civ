import { describe, expect, it } from "vitest";
import { BUILDINGS } from "../data/buildings";
import { IMPROVEMENTS } from "../data/improvements";
import { TERRAIN } from "../data/terrain";
import { UNITS } from "../data/units";
import { ICON } from "./glyphs";
import { legendHtml } from "./legend";

describe("help legend", () => {
  const html = legendHtml();

  it("explains every stat icon shown during play", () => {
    for (const glyph of [ICON.score, ICON.time, ICON.strength, ICON.moves]) expect(html).toContain(glyph);
    for (const word of ["Food", "Production", "Science", "Culture", "victory points"]) expect(html).toContain(word);
  });

  it("covers every terrain, improvement, unit, and building", () => {
    const names = [TERRAIN, IMPROVEMENTS, UNITS, BUILDINGS].flatMap((defs) => Object.values(defs).map((d) => d.name));
    for (const name of names) expect(html).toContain(name);
  });
});
