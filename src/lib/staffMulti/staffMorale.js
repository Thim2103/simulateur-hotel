// Global and per-hotel staff morale, based on each staff member's own
// `satisfaction` field (see restaurantRepository.js's toStaffRow() -- the
// same field lib/dailyCycle/updateStaff.js and lib/progression/reputation.js
// already read for their own single-hotel calculations).
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function averageSatisfaction(staff) {
  const safeStaff = safeArray(staff);
  if (!safeStaff.length) return null;
  return safeStaff.reduce((sum, person) => sum + Number(person.satisfaction || 0), 0) / safeStaff.length;
}

// hotels: the chain's hotel bundles (see lib/multiHotel/hotelFactory.js).
// Returns moraleByHotel (null for a hotel with no staff at all, rather than
// a misleading 0) and moraleGlobal, weighted by each hotel's headcount so a
// 20-person flagship counts more than a 2-person outpost.
export function calculateMorale(hotels = []) {
  const safeHotels = safeArray(hotels);

  const moraleByHotel = {};
  let weightedSum = 0;
  let totalStaff = 0;

  safeHotels.forEach((hotel) => {
    const staff = safeArray(hotel.restaurantState?.staff);
    const average = averageSatisfaction(staff);
    moraleByHotel[hotel.id] = average === null ? null : Math.round(average);
    if (average !== null) {
      weightedSum += average * staff.length;
      totalStaff += staff.length;
    }
  });

  const moraleGlobal = totalStaff ? Math.round(weightedSum / totalStaff) : null;

  return { moraleGlobal, moraleByHotel };
}
