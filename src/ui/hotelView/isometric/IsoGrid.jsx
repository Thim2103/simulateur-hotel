// The isometric grid: coordinate projection + depth sorting, the two
// pieces of pure math every other iso component needs, plus the ground
// plane itself (a diamond made of CSS borders -- no image asset).
//
// Grid size: 12x12 cells (well under the 32x32/48x48 the spec allows --
// a real hotel floor here only ever has a handful of rooms, see
// HotelRoomsLayer.jsx's own v1/v2 precedent of capping at what's actually
// useful to show; a bigger grid would just be empty tiles).
export const GRID_SIZE = 12;
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

// (col, row) grid coordinates -> {x, y} screen pixels, the classic
// isometric projection: screenX = (col - row) * (tileWidth / 2),
// screenY = (col + row) * (tileHeight / 2) -- i.e. exactly "x-y,
// (x+y)/2" scaled to the tile size the spec asks for.
export function toIso(col, row, tileWidth = TILE_WIDTH, tileHeight = TILE_HEIGHT) {
  return {
    x: (col - row) * (tileWidth / 2),
    y: (col + row) * (tileHeight / 2),
  };
}

// The painter's algorithm: draw far tiles first, near tiles last, so
// near objects correctly occlude far ones without any real z-buffer --
// `col + row` is the standard isometric depth key (see toIso() above).
// Returns a NEW array (never mutates), stable-sorted by depth.
export function depthSort(items, getCoords = (item) => item) {
  return items
    .map((item, index) => ({ item, index, ...getCoords(item) }))
    .sort((a, b) => (a.col + a.row - (b.col + b.row) || a.index - b.index))
    .map(({ item }) => item);
}

// The ground plane: a CSS-only diamond (border trick, no image) sized to
// the grid, purely decorative (aria-hidden) -- every actual floor/room/
// character renders as an absolutely-positioned child of the same stage,
// using toIso() for its own placement.
export default function IsoGrid({ children, className = "" }) {
  const width = GRID_SIZE * TILE_WIDTH;
  const height = GRID_SIZE * TILE_HEIGHT;
  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{ width, height: height + 240, perspective: "1200px" }}
    >
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-16 -translate-x-1/2 border border-slate-200/70 bg-gradient-to-b from-slate-100 to-slate-200"
        style={{
          width: TILE_WIDTH * (GRID_SIZE / 2),
          height: TILE_HEIGHT * (GRID_SIZE / 2),
          transform: "rotateX(55deg) rotateZ(45deg)",
          transformOrigin: "center",
        }}
      />
      <div className="absolute left-1/2 top-4" style={{ transform: "translateX(-50%)" }}>
        {children}
      </div>
    </div>
  );
}
