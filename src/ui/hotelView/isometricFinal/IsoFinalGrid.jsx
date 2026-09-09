import { PALETTE } from "./IsoFinalStyle";

// The premium view's grid: same isometric projection math every other
// view in this codebase uses (there's only one correct way to project
// x-y,(x+y)/2) -- a fresh, independent copy so isometricFinal/ stays a
// self-contained art-direction module, per the spec's "créer /src/ui/
// hotelView/isometricFinal/" (no v2/v3/RetroView component reused).
export const GRID_SIZE = 12;
export const TILE_WIDTH = 76;
export const TILE_HEIGHT = 38;

export function toIsoFinal(col, row, tileWidth = TILE_WIDTH, tileHeight = TILE_HEIGHT) {
  return {
    x: (col - row) * (tileWidth / 2),
    y: (col + row) * (tileHeight / 2),
  };
}

// Painter's algorithm depth sort: farther tiles (small col+row) drawn
// first, nearer ones last.
export function depthSortFinal(items, getCoords = (item) => item) {
  return items
    .map((item, index) => ({ item, index, ...getCoords(item) }))
    .sort((a, b) => (a.col + a.row - (b.col + b.row) || a.index - b.index))
    .map(({ item }) => item);
}

// The stage: a tiled (8x8px, see IsoFinalStyle.js's tileTexture()) pastel
// floor -- "carrelage : carreaux 8×8 px, ombre 45°, bleu glacier" -- under
// the positioned children.
export default function IsoFinalGrid({ children, className = "" }) {
  const width = GRID_SIZE * TILE_WIDTH;
  const height = GRID_SIZE * TILE_HEIGHT;
  return (
    <div className={`relative mx-auto ${className}`} style={{ width, height: height + 280 }}>
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-16 -translate-x-1/2 rounded-[2rem] border-2"
        style={{
          width: TILE_WIDTH * (GRID_SIZE / 2),
          height: TILE_HEIGHT * (GRID_SIZE / 2),
          borderColor: `${PALETTE.nightBlue}33`,
          backgroundImage: `repeating-linear-gradient(0deg, ${PALETTE.glacierBlue}, ${PALETTE.glacierBlue} 7px, rgba(0,0,0,0.08) 7px, rgba(0,0,0,0.08) 8px), repeating-linear-gradient(90deg, ${PALETTE.glacierBlue}, ${PALETTE.glacierBlue} 7px, rgba(0,0,0,0.08) 7px, rgba(0,0,0,0.08) 8px)`,
          backgroundSize: "8px 8px",
          transform: "rotateX(55deg) rotateZ(45deg)",
        }}
      />
      <div className="absolute left-1/2 top-4" style={{ transform: "translateX(-50%)" }}>
        {children}
      </div>
    </div>
  );
}
