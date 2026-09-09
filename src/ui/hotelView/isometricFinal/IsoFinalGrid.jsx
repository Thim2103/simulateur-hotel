import { PALETTE } from "./IsoFinalStyle";
import { tileToScreen } from "../engine/IsoProjection";
import { sortEntitiesByDepth } from "../engine/DepthSort";

// The premium view's grid. Projection and depth-sorting are no longer
// implemented here -- ui/hotelView/engine/IsoProjection.js and
// DepthSort.js are now the single source of truth for that math, shared
// by every isometric view (see their own docstrings). This file just
// carries isometricFinal/'s own tile size as a named projection config
// (`ISO_FINAL_PROJECTION`) and, below, keeps `toIsoFinal`/`depthSortFinal`
// as thin backward-compatible wrappers around the engine -- every sibling
// component (IsoFinalRoom.jsx, IsoFinalCharacter.jsx, etc.) now imports
// `tileToScreen`/`sortEntitiesByDepth` from the engine directly instead of
// these two, but keeping them here means nothing that already depended on
// this module's own exports (see IsoFinalGrid.test.jsx) needs to change.
export const GRID_SIZE = 12;
export const TILE_WIDTH = 76;
export const TILE_HEIGHT = 38;

export const ISO_FINAL_PROJECTION = {
  tileWidth: TILE_WIDTH,
  tileHeight: TILE_HEIGHT,
  elevationHeight: TILE_HEIGHT,
  originX: 0,
  originY: 0,
  scale: 1,
};

// Deprecated: use `tileToScreen({ col, row }, ISO_FINAL_PROJECTION)` from
// ui/hotelView/engine/IsoProjection.js directly in new code.
export function toIsoFinal(col, row, tileWidth = TILE_WIDTH, tileHeight = TILE_HEIGHT) {
  return tileToScreen({ col, row }, { ...ISO_FINAL_PROJECTION, tileWidth, tileHeight });
}

// Deprecated: use `sortEntitiesByDepth()` from
// ui/hotelView/engine/DepthSort.js directly in new code -- it works on
// world-space {x, y, z, width, depth, height} entities rather than
// {col, row} tiles, so a real footprint/elevation can be given. This
// wrapper adapts the old {col, row}-only call shape onto the same
// underlying algorithm (a zero-footprint, ground-level entity's depth key
// is exactly `col + row`, identical to what this function computed by
// hand before).
export function depthSortFinal(items, getCoords = (item) => item) {
  const wrapped = items.map((item) => {
    const { col, row } = getCoords(item);
    return { x: col, y: row, __item: item };
  });
  return sortEntitiesByDepth(wrapped).map((entity) => entity.__item);
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
