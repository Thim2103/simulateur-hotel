// Trains staff whose skill_level is below the chain's target, nudging their
// skill_level and productivity up a little each cycle they qualify.
const SKILL_TARGET = 70;
const SKILL_GAIN_PER_CYCLE = 5;
const PRODUCTIVITY_GAIN_PER_CYCLE = 2;
const MAX_TRAININGS_PER_HOTEL = 2;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Returns the training records to apply this cycle:
// [{ staffId, staffName, hotelId, skillBefore, skillAfter }]. Doesn't mutate
// `hotels` -- see applyTraining() for that.
export function planTraining(hotels = [], { maxPerHotel = MAX_TRAININGS_PER_HOTEL } = {}) {
  const records = [];

  safeArray(hotels).forEach((hotel) => {
    const staff = safeArray(hotel.restaurantState?.staff)
      .filter((person) => Number(person.skill_level || 0) < SKILL_TARGET)
      .sort((a, b) => Number(a.skill_level || 0) - Number(b.skill_level || 0))
      .slice(0, maxPerHotel);

    staff.forEach((person) => {
      const skillBefore = Number(person.skill_level || 0);
      records.push({
        staffId: person.id,
        staffName: person.name,
        hotelId: hotel.id,
        skillBefore,
        skillAfter: Math.round(clamp(skillBefore + SKILL_GAIN_PER_CYCLE, 0, 100)),
      });
    });
  });

  return records;
}

// Returns a new hotels array with each trained staff member's skill_level/
// productivity bumped up.
export function applyTraining(hotels = [], training = []) {
  const safeTraining = safeArray(training);
  if (!safeTraining.length) return safeArray(hotels);

  const trainingByStaffId = new Map(safeTraining.map((record) => [record.staffId, record]));

  return safeArray(hotels).map((hotel) => {
    const staff = safeArray(hotel.restaurantState?.staff);
    if (!staff.some((person) => trainingByStaffId.has(person.id))) return hotel;

    return {
      ...hotel,
      restaurantState: {
        ...hotel.restaurantState,
        staff: staff.map((person) => {
          const record = trainingByStaffId.get(person.id);
          if (!record) return person;
          return {
            ...person,
            skill_level: record.skillAfter,
            productivity: Math.round(clamp(Number(person.productivity || 0) + PRODUCTIVITY_GAIN_PER_CYCLE, 0, 100)),
          };
        }),
      },
    };
  });
}
