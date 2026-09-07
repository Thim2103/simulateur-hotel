// Promotes staff who have earned it: high skill and productivity, and
// enough experience to be trusted with more responsibility. A promotion
// bumps their role one rung up a simple seniority ladder and gives them a
// salary increase.
const PROMOTION_THRESHOLDS = { skillLevel: 75, productivity: 75, experienceYears: 1 };
const SALARY_INCREASE_RATE = 0.1;

// A generic seniority ladder: any role not explicitly listed is assumed to
// already be senior/specialist and isn't promoted further by this simple
// model (a "Directeur"/"Chef de cuisine" needs a manual raise, not an
// automatic promotion).
const ROLE_LADDER = {
  Serveur: "Serveur senior",
  Serveuse: "Serveuse senior",
  "Sous-chef": "Chef de cuisine",
  Réceptionniste: "Réceptionniste senior",
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isEligible(person) {
  return (
    Number(person.skill_level || 0) >= PROMOTION_THRESHOLDS.skillLevel &&
    Number(person.productivity || 0) >= PROMOTION_THRESHOLDS.productivity &&
    Number(person.experience_years || 0) >= PROMOTION_THRESHOLDS.experienceYears &&
    Boolean(ROLE_LADDER[person.role])
  );
}

// Returns the promotions to apply this cycle:
// [{ staffId, staffName, hotelId, fromRole, toRole, salaryBefore, salaryAfter }].
// Doesn't mutate `hotels` -- see applyPromotions() for that.
export function planPromotions(hotels = []) {
  const promotions = [];

  safeArray(hotels).forEach((hotel) => {
    safeArray(hotel.restaurantState?.staff)
      .filter(isEligible)
      .forEach((person) => {
        const salaryBefore = Number(person.salary || 0);
        promotions.push({
          staffId: person.id,
          staffName: person.name,
          hotelId: hotel.id,
          fromRole: person.role,
          toRole: ROLE_LADDER[person.role],
          salaryBefore,
          salaryAfter: Math.round(salaryBefore * (1 + SALARY_INCREASE_RATE)),
        });
      });
  });

  return promotions;
}

// Returns a new hotels array with each promoted staff member's role/salary updated.
export function applyPromotions(hotels = [], promotions = []) {
  const safePromotions = safeArray(promotions);
  if (!safePromotions.length) return safeArray(hotels);

  const promotionByStaffId = new Map(safePromotions.map((promotion) => [promotion.staffId, promotion]));

  return safeArray(hotels).map((hotel) => {
    const staff = safeArray(hotel.restaurantState?.staff);
    if (!staff.some((person) => promotionByStaffId.has(person.id))) return hotel;

    return {
      ...hotel,
      restaurantState: {
        ...hotel.restaurantState,
        staff: staff.map((person) => {
          const promotion = promotionByStaffId.get(person.id);
          if (!promotion) return person;
          return { ...person, role: promotion.toRole, salary: promotion.salaryAfter };
        }),
      },
    };
  });
}
