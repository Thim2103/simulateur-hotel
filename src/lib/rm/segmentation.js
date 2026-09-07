// Segment mix and per-segment ADR for the current reservation book. Builds
// on lib/calculs/rm.js's existing segmentation/segmentPerformance/
// channelYield rather than re-deriving the same classification logic.
import { channelYield, segmentPerformance, segmentation as segmentCounts } from "../calculs/rm";

export function runSegmentation({ reservations = [], occupancy = 50 } = {}) {
  const safeReservations = Array.isArray(reservations) ? reservations : [];
  const mix = segmentCounts(safeReservations);
  const performance = segmentPerformance(safeReservations);
  const channels = channelYield(safeReservations, occupancy);

  const adrBySegment = Object.fromEntries(
    Object.entries(performance).map(([segment, data]) => [segment, data.adr])
  );

  return { mix, adrBySegment, performance, channels };
}
