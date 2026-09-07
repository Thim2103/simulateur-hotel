// Chain-wide staffing recommendations, computed after transfers/training/
// promotions have already run for the cycle -- this looks at what's still
// imbalanced rather than moving people itself.
const UNDERSTAFFED_RATIO_THRESHOLD = 0.05; // staff per room below this is a real gap
const LOW_MORALE_THRESHOLD = 40;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function staffPerRoom(hotel) {
  const roomCount = Number(hotel.hotelState?.structure?.roomCount) || 0;
  const staffCount = safeArray(hotel.restaurantState?.staff).length;
  return roomCount ? staffCount / roomCount : 0;
}

// hotels: the post-transfer/training/promotion hotel bundles. transfers:
// this cycle's transfers (see staffTransfer.js), so a hotel that just
// received staff isn't immediately flagged as still needing more.
export function optimizeStaffing(hotels = [], transfers = []) {
  const safeHotels = safeArray(hotels);
  const recipientHotelIds = new Set(safeArray(transfers).map((transfer) => transfer.toHotelId));

  const recommendations = [];

  safeHotels.forEach((hotel) => {
    const staff = safeArray(hotel.restaurantState?.staff);
    if (staff.length === 0 && Number(hotel.hotelState?.structure?.roomCount) > 0) {
      recommendations.push({
        id: `no_staff_${hotel.id}`,
        hotelId: hotel.id,
        priority: "high",
        message: `${hotel.name} n'a aucun employé : recruter en urgence.`,
      });
      return;
    }

    if (!recipientHotelIds.has(hotel.id) && staffPerRoom(hotel) < UNDERSTAFFED_RATIO_THRESHOLD && staff.length > 0) {
      recommendations.push({
        id: `understaffed_${hotel.id}`,
        hotelId: hotel.id,
        priority: "medium",
        message: `${hotel.name} reste en sous-effectif après les transferts de ce cycle : envisager un recrutement.`,
      });
    }

    const averageSatisfaction = staff.length ? staff.reduce((sum, person) => sum + Number(person.satisfaction || 0), 0) / staff.length : null;
    if (averageSatisfaction !== null && averageSatisfaction < LOW_MORALE_THRESHOLD) {
      recommendations.push({
        id: `low_morale_${hotel.id}`,
        hotelId: hotel.id,
        priority: "high",
        message: `Le moral de l'équipe de ${hotel.name} est bas (${Math.round(averageSatisfaction)}/100) : risque de grève ou de départs.`,
      });
    }
  });

  return { recommendations };
}
