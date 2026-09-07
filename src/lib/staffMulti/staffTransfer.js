// Moves staff between hotels in the chain to smooth out over/under-staffing:
// a hotel with far more staff per room than the chain average lends its
// lowest-morale member (a transfer is also a fresh start for them) to the
// hotel furthest below average.
const TARGET_RATIO_TOLERANCE = 0.15; // 15% above/below the chain average is considered balanced
const MAX_TRANSFERS_PER_CYCLE = 2;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function staffPerRoom(hotel) {
  const roomCount = Number(hotel.hotelState?.structure?.roomCount) || 0;
  const staffCount = safeArray(hotel.restaurantState?.staff).length;
  return roomCount ? staffCount / roomCount : 0;
}

// Returns the transfers to make this cycle: [{ staffId, staffName, fromHotelId, toHotelId, reason }].
// Doesn't mutate `hotels` -- see applyTransfers() for that.
export function planTransfers(hotels = [], { maxTransfers = MAX_TRANSFERS_PER_CYCLE } = {}) {
  const safeHotels = safeArray(hotels).filter((hotel) => Number(hotel.hotelState?.structure?.roomCount) > 0);
  if (safeHotels.length < 2) return [];

  const ratios = safeHotels.map((hotel) => ({ hotel, ratio: staffPerRoom(hotel) }));
  const averageRatio = ratios.reduce((sum, entry) => sum + entry.ratio, 0) / ratios.length;
  if (!averageRatio) return [];

  const transfers = [];
  const donors = ratios.filter((entry) => entry.ratio > averageRatio * (1 + TARGET_RATIO_TOLERANCE)).sort((a, b) => b.ratio - a.ratio);
  const recipients = ratios
    .filter((entry) => entry.ratio < averageRatio * (1 - TARGET_RATIO_TOLERANCE))
    .sort((a, b) => a.ratio - b.ratio);

  const usedStaffIds = new Set();
  let donorIndex = 0;
  let recipientIndex = 0;

  while (donorIndex < donors.length && recipientIndex < recipients.length && transfers.length < maxTransfers) {
    const donorHotel = donors[donorIndex].hotel;
    const recipientHotel = recipients[recipientIndex].hotel;
    const staff = safeArray(donorHotel.restaurantState?.staff).filter((person) => !usedStaffIds.has(person.id));

    if (staff.length <= 1) {
      donorIndex += 1;
      continue;
    }

    // Give up the lowest-morale staff member: the transfer is a fresh start.
    const candidate = [...staff].sort((a, b) => Number(a.satisfaction || 0) - Number(b.satisfaction || 0))[0];
    usedStaffIds.add(candidate.id);
    transfers.push({
      staffId: candidate.id,
      staffName: candidate.name,
      fromHotelId: donorHotel.id,
      toHotelId: recipientHotel.id,
      reason: `Rééquilibrage : ${donorHotel.name} est en sureffectif, ${recipientHotel.name} manque de personnel.`,
    });

    donorIndex += 1;
    recipientIndex += 1;
  }

  return transfers;
}

// Returns a new hotels array with each transfer's staff member moved from
// their origin hotel's restaurantState.staff to their destination's.
export function applyTransfers(hotels = [], transfers = []) {
  const safeTransfers = safeArray(transfers);
  if (!safeTransfers.length) return safeArray(hotels);

  const movedStaffById = new Map();
  safeTransfers.forEach((transfer) => {
    const fromHotel = hotels.find((hotel) => hotel.id === transfer.fromHotelId);
    const staffMember = safeArray(fromHotel?.restaurantState?.staff).find((person) => person.id === transfer.staffId);
    if (staffMember) movedStaffById.set(transfer.staffId, { staffMember, toHotelId: transfer.toHotelId });
  });

  return safeArray(hotels).map((hotel) => {
    const remainingStaff = safeArray(hotel.restaurantState?.staff).filter((person) => !movedStaffById.has(person.id));
    const incoming = [...movedStaffById.values()].filter((entry) => entry.toHotelId === hotel.id).map((entry) => entry.staffMember);
    if (remainingStaff.length === safeArray(hotel.restaurantState?.staff).length && incoming.length === 0) return hotel;

    return { ...hotel, restaurantState: { ...hotel.restaurantState, staff: [...remainingStaff, ...incoming] } };
  });
}
