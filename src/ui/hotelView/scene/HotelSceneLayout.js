// The hotel's spatial layout, in TILE space (see IsoProjection.js's own
// docstring for what "tile space" means: {col, row, elevation}). This is
// the ONE place that says *where* things sit on the grid -- réception,
// restaurant, cuisine, bar, laverie, hall, chambres, étages. Nothing here
// knows about business data (occupancy, ADR, housekeeping...); it only
// knows spatial facts, so it can be swapped out later (a bigger hotel, a
// different floor plan) without EntityFactory.js having to change at all.
//
// This mirrors, tile-for-tile, the positions IsoFinalView.jsx used to
// compute inline before this step -- moving here is a pure extraction, not
// a redesign, so today's visual result stays identical.

export const FLOOR_COUNT = 4;
// The ground floor's own row, one past the last upper floor's row (floors
// are laid out row 0..FLOOR_COUNT-1, top floor first; the ground floor --
// reception, restaurant, etc. -- sits at row FLOOR_COUNT, just below them).
export const GROUND_ROW = FLOOR_COUNT;

// Ground-floor amenities: fixed tiles, independent of how many rooms/
// floors the hotel has. Each is two columns apart so its ~1.5-tile-wide
// visual footprint never overlaps its neighbour.
export const AMENITY_LAYOUT = {
  reception: { col: 0, row: GROUND_ROW, elevation: 0 },
  restaurant: { col: 2, row: GROUND_ROW, elevation: 0 },
  kitchen: { col: 4, row: GROUND_ROW, elevation: 0 },
  bar: { col: 6, row: GROUND_ROW, elevation: 0 },
  laundry: { col: 8, row: GROUND_ROW, elevation: 0 },
  hall: { col: 10, row: GROUND_ROW, elevation: 0 },
};

// Deterministic room tile: a room's position depends only on which floor
// it's on and its index within that floor's row -- never on the room's own
// business data (id/number/status), so the same (floorIndex, indexInFloor)
// always yields the same tile regardless of occupancy/cleaning state.
// `elevation` counts down from the top floor (FLOOR_COUNT) so higher
// floors render visually higher, matching the "level" numbering the old
// inline logic used (`FLOOR_COUNT - floorIndex`).
export function roomTile({ floorIndex, indexInFloor }) {
  return { col: indexInFloor, row: floorIndex, elevation: FLOOR_COUNT - floorIndex };
}

// Ambient guest/staff character tiles. Characters are aggregate, unnamed
// presences (see EntityFactory.js's own docstring) rather than individual
// guests -- their tile is a deterministic function of their own slot index
// and how many rooms sit on one floor row, not of any real guest's data.
export function guestTile({ index, roomsPerFloor }) {
  return { col: (index % Math.max(1, roomsPerFloor)) + 0.5, row: GROUND_ROW - 0.5, elevation: 0 };
}

export function staffTile({ index, roomsPerFloor }) {
  return { col: (index % Math.max(1, roomsPerFloor)) + 1, row: GROUND_ROW - 1, elevation: 0 };
}

// Incident markers line up to the right of the ground-floor amenities, one
// tile apart, starting right after the hall.
export function incidentTile({ index }) {
  return { col: 11 + index, row: GROUND_ROW, elevation: 0 };
}

const HotelSceneLayout = {
  FLOOR_COUNT,
  GROUND_ROW,
  AMENITY_LAYOUT,
  roomTile,
  guestTile,
  staffTile,
  incidentTile,
};
export default HotelSceneLayout;
