// Daily hotel revenue: room nights actually occupied today, plus upsells
// (minibar/spa/extras) and minus the commission paid on OTA-sourced
// bookings. Operates on a single calendar day, unlike lib/hotel.js's
// buildHotelSimulation() which works off monthly aggregates.
const UPSELL_PER_OCCUPIED_ROOM = 14; // EUR/room/day: minibar, spa, breakfast extras, etc.
const OTA_COMMISSION_RATE = 0.18; // matches rm.js's channelYield() OTA commission assumption

function toDateOnly(value) {
  return String(value || "").slice(0, 10);
}

function isConfirmed(reservation) {
  const status = String(reservation?.status || "").toLowerCase();
  return status.includes("confirm") || status === "booked";
}

function isActiveToday(reservation, day) {
  const arrival = toDateOnly(reservation.arrival);
  const departure = toDateOnly(reservation.departure);
  return arrival && departure && day >= arrival && day < departure;
}

function isOtaChannel(reservation) {
  const value = String(reservation?.channel || reservation?.source || "").toLowerCase();
  return value.includes("ota") || value.includes("booking") || value.includes("expedia");
}

// Calculates today's hotel revenue from the room reservations that are
// checked-in (confirmed, arrival <= today < departure). Returns the gross
// room revenue, the estimated upsell revenue, the OTA commission paid away,
// and the resulting net revenue.
export function calculateHotelRevenue({ reservations = [], referenceDate = new Date() } = {}) {
  const day = toDateOnly(referenceDate.toISOString ? referenceDate.toISOString() : referenceDate);
  const safeReservations = Array.isArray(reservations) ? reservations : [];

  const activeToday = safeReservations.filter((reservation) => isConfirmed(reservation) && isActiveToday(reservation, day));

  let roomRevenue = 0;
  let otaCommission = 0;
  const occupiedRoomIds = new Set();

  activeToday.forEach((reservation) => {
    const price = Number(reservation.price) || 0;
    roomRevenue += price;
    occupiedRoomIds.add(String(reservation.room_id ?? reservation.roomId ?? reservation.room ?? reservation.id));
    if (isOtaChannel(reservation)) otaCommission += price * OTA_COMMISSION_RATE;
  });

  const occupiedRooms = occupiedRoomIds.size;
  const upsellRevenue = occupiedRooms * UPSELL_PER_OCCUPIED_ROOM;
  const netRevenue = roomRevenue + upsellRevenue - otaCommission;

  return {
    date: day,
    occupiedRooms,
    roomRevenue: Math.round(roomRevenue),
    upsellRevenue: Math.round(upsellRevenue),
    otaCommission: Math.round(otaCommission),
    netRevenue: Math.round(netRevenue),
  };
}
