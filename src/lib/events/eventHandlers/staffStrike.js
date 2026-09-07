// A staff strike: much more likely when the team's average morale
// (satisfaction) is already low. Hurts revenue while it lasts, but the
// eventual concessions management makes to end it give morale a bump.
function averageSatisfaction(staff) {
  const safeStaff = Array.isArray(staff) ? staff : [];
  if (!safeStaff.length) return 100; // no staff to strike
  return safeStaff.reduce((sum, person) => sum + Number(person.satisfaction || 0), 0) / safeStaff.length;
}

export const staffStrikeEvent = {
  id: "staff_strike",
  name: "Grève du personnel",
  category: "staff",
  conditions: ({ restaurantState }) => (Array.isArray(restaurantState?.staff) ? restaurantState.staff.length : 0) > 0,
  probability: ({ restaurantState }) => {
    const morale = averageSatisfaction(restaurantState?.staff);
    if (morale < 40) return 0.3;
    if (morale < 60) return 0.08;
    return 0.01;
  },
  apply: () => ({ message: "Le personnel se met en grève pour réclamer de meilleures conditions.", severity: "high" }),
  impact: { revenue: -400, expenses: 100, staff: 8, reputation: -2 },
  duration: 2,
};
