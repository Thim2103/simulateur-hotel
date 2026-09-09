// The retro-modern grid: the same isometric projection math as v3's
// IsoGrid.jsx (it's just geometry, x-y/(x+y)/2 -- there's only one
// correct way to do it), kept as its own small, independent copy here
// rather than imported from v3 so isometricRetro/ stays a self-contained
// art direction module, per the spec's "créer /src/ui/hotelView/
// isometricRetro/" -- a directory, not an extension of v3's.
export const GRID_SIZE = 12;
export const TILE_WIDTH = 72;
export const TILE_HEIGHT = 36;

export function toIsoRetro(col, row, tileWidth = TILE_WIDTH, tileHeight = TILE_HEIGHT) {
  return {
    x: (col - row) * (tileWidth / 2),
    y: (col + row) * (tileHeight / 2),
  };
}

// Painter's algorithm, artistic depth sort: farther tiles (small col+row)
// drawn first, nearer ones last, so a character standing "in front of" a
// room visually overlaps it correctly.
export function depthSortRetro(items, getCoords = (item) => item) {
  return items
    .map((item, index) => ({ item, index, ...getCoords(item) }))
    .sort((a, b) => (a.col + a.row - (b.col + b.row) || a.index - b.index))
    .map(({ item }) => item);
}

// The stylised stage: a soft pastel "floor" wash (not the technical grey
// diamond v3 used) plus the positioned stage children.
export default function RetroGrid({ children, className = "" }) {
  const width = GRID_SIZE * TILE_WIDTH;
  const height = GRID_SIZE * TILE_HEIGHT;
  return (
    <div className={`relative mx-auto ${className}`} style={{ width, height: height + 260 }}>
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-16 -translate-x-1/2 rounded-[2rem] border-2 border-[#0284c7]/20 bg-gradient-to-b from-[#e0f2fe] to-[#fce7f3]"
        style={{ width: TILE_WIDTH * (GRID_SIZE / 2), height: TILE_HEIGHT * (GRID_SIZE / 2), transform: "rotateX(55deg) rotateZ(45deg)" }}
      />
      <div className="absolute left-1/2 top-4" style={{ transform: "translateX(-50%)" }}>
        {children}
      </div>
    </div>
  );
}
