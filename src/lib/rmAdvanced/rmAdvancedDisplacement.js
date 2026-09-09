// Displacement -- revenue left on the table when a high-compression date
// (see rmAdvancedCompression.js) is filled with a lower-ADR segment
// (groups/OTA) instead of a higher-ADR one (corporate/direct) that could
// have taken the same room. Classic RM concept: on a near-full date,
// every low-ADR booking "displaces" a potential higher-ADR one.
import { safeArray, safeNumber } from "../safe";

function isConfirmed(reservation) {
  const status = String(reservation?.status || "").toLowerCase();
  return status.includes("confirm") || status.includes("occupied") || status === "booked";
}

function reservationSegment(reservation) {
  const value = String(reservation?.segment || reservation?.market_segment || "").toLowerCase();
  if (value.includes("corpor") || value.includes("business")) return "corporate";
  if (value.includes("ota") || value.includes("online")) return "ota";
  if (value.includes("group") || value.includes("groupe")) return "groups";
  return "leisure";
}

function toDateOnly(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// options:
//   reservations: the PMS state's reservations array.
//   compression: the output of computeCompression() -- reused so both
//     modules agree on which dates are "high compression".
export function computeDisplacement({ reservations = [], compression = null } = {}) {
  const safeReservations = safeArray(reservations, []).filter(isConfirmed);
  const highCompressionDates = new Set(safeArray(compression?.highCompressionDates ?? [], []));

  if (!highCompressionDates.size) return { bySegment: {}, totalLoss: 0, worstDates: [] };

  const lossByDate = {};
  const bySegment = {};

  highCompressionDates.forEach((dateKey) => {
    const activeOnDate = safeReservations.filter((reservation) => {
      const arrival = reservation.arrival ? toDateOnly(reservation.arrival) : null;
      const departure = reservation.departure ? toDateOnly(reservation.departure) : null;
      return arrival && departure && dateKey >= arrival && dateKey < departure;
    });
    if (!activeOnDate.length) return;

    const adrBySegment = {};
    activeOnDate.forEach((reservation) => {
      const segment = reservationSegment(reservation);
      const price = safeNumber(reservation.price, 0);
      if (!adrBySegment[segment]) adrBySegment[segment] = { total: 0, count: 0 };
      adrBySegment[segment].total += price;
      adrBySegment[segment].count += 1;
    });

    const segmentAverages = Object.fromEntries(
      Object.entries(adrBySegment).map(([segment, { total, count }]) => [segment, count ? total / count : 0])
    );
    const bestAdr = Math.max(...Object.values(segmentAverages), 0);
    if (bestAdr <= 0) return;

    let dateLoss = 0;
    Object.entries(adrBySegment).forEach(([segment, { total, count }]) => {
      const avgAdr = count ? total / count : 0;
      const gap = Math.max(0, bestAdr - avgAdr);
      const loss = gap * count;
      if (loss <= 0) return;
      dateLoss += loss;
      bySegment[segment] = Math.round((bySegment[segment] || 0) + loss);
    });

    if (dateLoss > 0) lossByDate[dateKey] = Math.round(dateLoss);
  });

  const totalLoss = Math.round(Object.values(lossByDate).reduce((sum, value) => sum + value, 0));
  const worstDates = Object.entries(lossByDate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([date, loss]) => ({ date, loss }));

  return { bySegment, totalLoss, worstDates };
}
