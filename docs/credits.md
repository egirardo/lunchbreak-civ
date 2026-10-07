# Credits

## Art

All sprites are **original pixel art created for Lunchbreak Civ** and released under **CC0** (public domain). No third-party art is used.

- Source: `src/ui/spriteData.ts` (16×16 pixel grids and a shared palette), rendered to SVG data URLs at runtime by `src/ui/sprites.ts`.
- Why generated rather than a pack: a single consistent style covering terrain, units, buildings, cities and UI icons, with team-colour pixels (`T`) the UI can recolour per player via `tintedSpriteUrl`.

To edit a sprite, change its rows in `spriteData.ts`; every row must be exactly 16 characters and use palette characters (`.` is transparent).

## Audio

All sound effects and music are synthesized at runtime with the Web Audio API (`src/ui/audio.ts`). No audio files are used.
