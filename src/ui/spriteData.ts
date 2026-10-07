import type { SpriteKey } from "./sprites";

/** Original pixel art for Lunchbreak Civ (CC0). Each sprite is 16x16; "." is transparent. */
export const SPRITE_SIZE = 16;

/** Pixels drawn with this character take the owning player's colour (see tintedSpriteUrl). */
export const TINT_CHAR = "T";

export const PALETTE: Record<string, string> = {
  k: "#1b1b24",
  g: "#5fa043",
  G: "#7cc25a",
  d: "#2f6b2e",
  D: "#1f4a20",
  b: "#7a4f2a",
  B: "#a8743f",
  y: "#e8c547",
  Y: "#f7e7a1",
  w: "#3a78c9",
  W: "#a9d3f5",
  n: "#24508f",
  s: "#8a8f99",
  S: "#c4c8cf",
  x: "#5a5e66",
  o: "#f4f6f8",
  h: "#8fa04a",
  H: "#b9a35a",
  f: "#e0b48a",
  r: "#b8432f",
  m: "#b0b8c4",
  M: "#6d7480",
  c: "#5fc9d9",
  p: "#9b6ad6",
  Q: "#151821",
  q: "#2a3042",
  T: "#e8e4d8",
};

type Canvas = string[][];

function blank(fill = "."): Canvas {
  return Array.from({ length: SPRITE_SIZE }, () => Array<string>(SPRITE_SIZE).fill(fill));
}

function set(c: Canvas, x: number, y: number, ch: string): void {
  const row = c[y];
  if (row && x >= 0 && x < SPRITE_SIZE) row[x] = ch;
}

function get(c: Canvas, x: number, y: number): string {
  return c[y]?.[x] ?? ".";
}

/** Copies a template onto the canvas; "." in the template leaves the canvas untouched. */
function stamp(c: Canvas, tpl: readonly string[], x: number, y: number): Canvas {
  tpl.forEach((line, dy) => {
    [...line].forEach((ch, dx) => {
      if (ch !== ".") set(c, x + dx, y + dy, ch);
    });
  });
  return c;
}

function rect(c: Canvas, x0: number, y0: number, x1: number, y1: number, fill: string, outline = "k"): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      set(c, x, y, x === x0 || x === x1 || y === y0 || y === y1 ? outline : fill);
    }
  }
}

/** Adds a dark outline around every opaque pixel. */
function outline(c: Canvas): Canvas {
  const out = c.map((r) => [...r]);
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (get(c, x, y) !== ".") continue;
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const n = get(c, x + (dx ?? 0), y + (dy ?? 0));
        return n !== "." && n !== "k";
      });
      if (touches) set(out, x, y, "k");
    }
  }
  return out;
}

function rows(c: Canvas): string[] {
  return c.map((r) => r.join(""));
}

// ---------- terrain ----------

const TUFT = ["G.G", ".G."];
const TREE = ["...d...", "..ddd..", "..dGd..", ".ddddd.", ".dGddd.", "DdddddD", "...b..."];
const MOUND = ["...HHHH...", "..HHhhhhb.", ".HHhhhhhhb", "HHhhhhhhhb", "hhhhhhhhhb"];
const SMALL_MOUND = [".HHH..", "HHhhhb", "hhhhhb"];
const WAVE = [".WW..", "W..WW"];

function grassland(): Canvas {
  const c = blank("g");
  for (const [x, y] of [[1, 2], [9, 1], [12, 6], [5, 6], [0, 10], [10, 11], [6, 13], [13, 13]] as const) stamp(c, TUFT, x, y);
  return c;
}

function forest(): Canvas {
  const c = blank("g");
  stamp(c, TUFT, 12, 0);
  stamp(c, TUFT, 0, 13);
  for (const [x, y] of [[0, 0], [8, 2], [2, 8], [9, 9]] as const) stamp(c, TREE, x, y);
  return c;
}

function hills(): Canvas {
  const c = blank("g");
  stamp(c, TUFT, 11, 0);
  stamp(c, TUFT, 1, 12);
  stamp(c, MOUND, 0, 2);
  stamp(c, SMALL_MOUND, 10, 4);
  stamp(c, MOUND, 6, 9);
  return c;
}

function peak(c: Canvas, cx: number, top: number, slope: number): void {
  for (let y = top; y < SPRITE_SIZE; y++) {
    const half = Math.floor((y - top) * slope);
    for (let x = cx - half; x <= cx + half; x++) {
      let ch = x <= cx ? "S" : "x";
      if (y - top < 3) ch = "o";
      if (x === cx - half || x === cx + half) ch = "k";
      set(c, x, y, ch);
    }
  }
}

function mountains(): Canvas {
  const c = blank("g");
  peak(c, 12, 6, 0.55);
  peak(c, 6, 1, 0.55);
  return c;
}

function water(): Canvas {
  const c = blank("w");
  for (const [x, y] of [[1, 2], [9, 4], [4, 8], [11, 10], [1, 13], [9, 14]] as const) stamp(c, WAVE, x, y);
  for (const [x, y] of [[7, 1], [14, 7], [2, 5], [6, 12], [14, 2]] as const) set(c, x, y, "n");
  return c;
}

function river(): Canvas {
  const c = blank();
  for (let x = 0; x < SPRITE_SIZE; x++) {
    const yc = 7 + Math.round(Math.sin((x * Math.PI) / 7.5) * 1.5);
    set(c, x, yc - 1, "n");
    set(c, x, yc, x % 4 === 0 ? "W" : "w");
    set(c, x, yc + 1, "w");
    set(c, x, yc + 2, "n");
  }
  return c;
}

function fog(): Canvas {
  const c = blank("Q");
  for (let y = 0; y < SPRITE_SIZE; y++) for (let x = 0; x < SPRITE_SIZE; x++) if ((x + y) % 4 === 0) set(c, x, y, "q");
  return c;
}

// ---------- improvements (drawn in the lower-right corner, under units) ----------

const FARM = ["kkkkkkkk", "kyYyYyYk", "kbbbbbbk", "kYyYyYyk", "kbbbbbbk", "kkkkkkkk"];
const MINE = ["..kkkk..", ".kbbbbk.", "kbkkkkbk", "kbkkkkbk", "kbkkkkbk", "xxxxxxxx"];

// ---------- units (neutral; "T" marks the team-colour tunic) ----------

const PERSON = [
  "................",
  "......kkk.......",
  ".....kfffk......",
  ".....kfffk......",
  "......kkk.......",
  ".....kTTTk......",
  "....kTTTTTk.....",
  "....kTTTTTk.....",
  "....kfTTTfk.....",
  ".....kTTTk......",
  ".....kbkbk......",
  ".....kbkbk......",
  ".....kbkbk......",
  ".....kk.kk......",
  "................",
  "................",
];

function person(): Canvas {
  return stamp(blank(), PERSON, 0, 0);
}

function warrior(): Canvas {
  const c = person();
  stamp(c, [".kk.", "kBBk", "kBBk", "kbbk", ".kbk", ".kbk", ".kbk", ".kk."], 9, 2);
  stamp(c, [".kkk.", "kmMmk", "kMmMk", "kmMmk", "kMmMk", ".kkk."], 1, 6);
  return c;
}

function archer(): Canvas {
  const c = person();
  stamp(c, ["..k..", ".kTk.", "kTfTk"], 5, 0);
  stamp(c, ["kBB.", "S.Bk", "S..B", "S..B", "S..B", "S..B", "S..B", "S..B", "S.Bk", "kBB."], 10, 2);
  return c;
}

function swordsman(): Canvas {
  const c = person();
  stamp(c, ["..T..", ".kkk.", "kmmmk"], 5, 0);
  stamp(c, ["..k..", ".kSk.", ".kSk.", ".kSk.", ".kSk.", ".kSk.", "kMMMk", "..b..", "..b.."], 9, 0);
  stamp(c, ["kkkkk", "kmTmk", "kmTmk", "kmTmk", ".kTk.", "..k.."], 1, 5);
  return c;
}

function settler(): Canvas {
  const c = person();
  stamp(c, ["..kkk..", "kkbbbkk"], 4, 0);
  stamp(c, [".kkk.", "kBBBk", "kBbBk", "kBBBk", ".kkk."], 1, 5);
  stamp(c, ["kBk", ".b.", ".b.", ".b.", ".b.", ".b.", ".b.", ".b.", ".b.", ".b.", ".b.", ".b."], 10, 2);
  return c;
}

function worker(): Canvas {
  const c = person();
  stamp(c, [".kkkkk.", "kyyyyyk"], 4, 0);
  stamp(c, [".kkkkk.", "kMMMMMk", ".kkbkk.", "...b...", "...b...", "...b...", "...b..."], 9, 2);
  return c;
}

const HORSEMAN = [
  "......kkk.......",
  ".....kfffk......",
  ".....kfffk......",
  "......kkk...kk..",
  ".....kTTTk.kBBk.",
  "....kTTTTTkBBBBk",
  "....kfTTTfkBkBBk",
  "..kkkkTTTkBBBkk.",
  ".kBBBBbTbBBBBk..",
  "kBkBBBbBBBBBBk..",
  "kk.kBBBBBBBBBk..",
  "...kBkkkkkkBkk..",
  "...kBk....kBk...",
  "...kBk....kBk...",
  "...kkk....kkk...",
  "................",
];

// ---------- buildings ----------

const GRANARY = [
  "................",
  ".....kkkkkk.....",
  "....krrrrrrk....",
  "...krrrrrrrrk...",
  "..krrrrrrrrrrk..",
  "..kkkkkkkkkkkk..",
  "...kBBBBBBBBk...",
  "...kBbBBBBbBk...",
  "...kBBkkkkBBk...",
  "...kBBkyykBBk...",
  "...kBBkYykBBk...",
  "...kBBkyYkBBk...",
  "...kkkkkkkkkk...",
  "................",
  "................",
  "................",
];

const WORKSHOP = [
  "................",
  "..........kkk...",
  ".........kxxxk..",
  ".........kxxxk..",
  "..........kbk...",
  "..........kbk...",
  "..........kbk...",
  "..kkkkkkkkkkkkk.",
  ".kmmmmmmmmmmmmk.",
  "..kMMMMMMMMMMk..",
  "....kkMMMMkk....",
  ".....kMMMMk.....",
  "....kMMMMMMk....",
  "...kkkkkkkkkk...",
  "................",
  "................",
];

const WALLS = [
  "................",
  "................",
  "................",
  ".kkk..kkk..kkk..",
  ".kSk..kSk..kSk..",
  ".kSkkkkSkkkkSk..",
  ".kSSSSSSSSSSSk..",
  ".kxxxxxxxxxxxk..",
  ".kSSSxSSSSxSSk..",
  ".kSSSxSSSSxSSk..",
  ".kxxxxxxxxxxxk..",
  ".kSxSSSSxSSSSk..",
  ".kSxSSSSxSSSSk..",
  ".kkkkkkkkkkkkk..",
  "................",
  "................",
];

const LIBRARY = [
  "................",
  "................",
  "................",
  "..kkkkk..kkkkk..",
  ".kSSSSSkkSSSSSk.",
  ".kSxxxSkkSxxxSk.",
  ".kSSSSSkkSSSSSk.",
  ".kSxxxSkkSxxxSk.",
  ".kSSSSSkkSSSSSk.",
  ".kSxxxSkkSxxxSk.",
  ".kSSSSSkkSSSSSk.",
  ".kkkkkkbbkkkkkk.",
  "..kbbbbbbbbbbk..",
  "...kkkkkkkkkk...",
  "................",
  "................",
];

const TEMPLE = [
  "................",
  "................",
  ".......kk.......",
  ".....kkSSkk.....",
  "...kkSSSSSSkk...",
  ".kkSSSSSSSSSSkk.",
  ".kkkkkkkkkkkkkk.",
  "..kSk.kSk.kSk...",
  "..kSk.kSk.kSk...",
  "..kSk.kSk.kSk...",
  "..kSk.kSk.kSk...",
  "..kSk.kSk.kSk...",
  ".kkkkkkkkkkkkkk.",
  ".kSSSSSSSSSSSSk.",
  ".kkkkkkkkkkkkkk.",
  "................",
];

const UNIVERSITY = [
  "................",
  "................",
  "................",
  "................",
  ".......kk.......",
  ".....kknnkk.....",
  "...kknnnnnnkk...",
  ".kknnnnnnnnnnkk.",
  "...kknnnnnnkky..",
  "....kkknnkkk.y..",
  "....knnnnnnk.y..",
  "....knnnnnnkyyy.",
  ".....kkkkkk.yyy.",
  "................",
  "................",
  "................",
];

// ---------- cities ----------

const HUT = ["..kk..", ".krrk.", "krrrrk", "kBBBBk", "kBkkBk", "kkkkkk"];

function smallCity(): Canvas {
  const c = blank();
  stamp(c, HUT, 1, 6);
  stamp(c, HUT, 8, 8);
  return c;
}

function largeCity(): Canvas {
  const c = blank();
  rect(c, 6, 3, 9, 9, "S");
  stamp(c, ["kk..kk", "kSkkSk"], 5, 1);
  set(c, 7, 5, "k");
  set(c, 8, 5, "k");
  stamp(c, HUT, 0, 7);
  stamp(c, HUT, 10, 7);
  stamp(c, HUT, 5, 10);
  return c;
}

function capital(): Canvas {
  const c = blank();
  rect(c, 1, 5, 5, 14, "S");
  rect(c, 10, 5, 14, 14, "S");
  rect(c, 4, 8, 11, 14, "S");
  for (const x of [1, 3, 5, 10, 12, 14]) set(c, x, 4, "k");
  rect(c, 6, 11, 9, 14, "b");
  for (let y = 0; y <= 7; y++) set(c, 7, y, "k");
  stamp(c, ["TTTk", "TTTk", "kkk."], 8, 0);
  set(c, 3, 8, "k");
  set(c, 12, 8, "k");
  return c;
}

// ---------- UI icons ----------

const FOOD = [
  "................",
  ".......k........",
  "......kyk.......",
  ".....kyYyk......",
  ".....kyYyk......",
  "..k..kyYyk..k...",
  ".kyk.kyYyk.kyk..",
  "kyYyk.kyk.kyYyk.",
  "kyYyk.kbk.kyYyk.",
  ".kyykkkbkkkyyk..",
  "..kbbkkbkkbbk...",
  "....kkkbkkk.....",
  "......kbk.......",
  "......kbk.......",
  "......kkk.......",
  "................",
];

const SCIENCE = [
  "................",
  "......kkkk......",
  "......kSSk......",
  "......kSSk......",
  "......kSSk......",
  ".....kSSSSk.....",
  "....kSSSSSSk....",
  "...kSSSSSSSSk...",
  "..kcccccccccck..",
  "..kcWccccWccck..",
  ".kcccccccccccck.",
  ".kccWcccccWccck.",
  ".kcccccccccccck.",
  "..kkkkkkkkkkkk..",
  "................",
  "................",
];

const CULTURE = [
  "................",
  ".......kk.......",
  "......kppk......",
  "......kppk......",
  ".kkkkkkppkkkkkk.",
  "..kppppppppppk..",
  "...kppppppppk...",
  "....kppppppk....",
  "....kppppppk....",
  "...kppppppppk...",
  "...kpppkkpppk...",
  "..kpppk..kpppk..",
  "..kppk....kppk..",
  ".kkk........kkk.",
  "................",
  "................",
];

function gear(): Canvas {
  const c = blank();
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const d = Math.hypot(dx, dy);
      const sector = Math.round(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 16) % 2 === 0;
      if ((d > 2.2 && d <= 5) || (d > 5 && d <= 7 && sector)) set(c, x, y, d < 3.5 ? "M" : "m");
    }
  }
  return outline(c);
}

// ---------- registry ----------

export const SPRITES: Record<SpriteKey, readonly string[]> = {
  "terrain:grassland": rows(grassland()),
  "terrain:forest": rows(forest()),
  "terrain:hills": rows(hills()),
  "terrain:water": rows(water()),
  "terrain:mountains": rows(mountains()),
  "overlay:river": rows(river()),
  "improvement:farm": rows(stamp(blank(), FARM, 8, 10)),
  "improvement:mine": rows(stamp(blank(), MINE, 8, 10)),
  "unit:settler": rows(settler()),
  "unit:warrior": rows(warrior()),
  "unit:archer": rows(archer()),
  "unit:horseman": rows(stamp(blank(), HORSEMAN, 0, 0)),
  "unit:worker": rows(worker()),
  "unit:swordsman": rows(swordsman()),
  "building:granary": GRANARY,
  "building:workshop": WORKSHOP,
  "building:walls": WALLS,
  "building:library": LIBRARY,
  "building:temple": TEMPLE,
  "building:university": UNIVERSITY,
  "city:small": rows(smallCity()),
  "city:large": rows(largeCity()),
  "city:capital": rows(capital()),
  "ui:food": FOOD,
  "ui:production": rows(gear()),
  "ui:science": SCIENCE,
  "ui:culture": CULTURE,
  "ui:fog": rows(fog()),
};
