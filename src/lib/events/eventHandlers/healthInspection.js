// A surprise health/sanitary inspection. The outcome leans on the
// restaurant staff's average satisfaction as a (rough) proxy for how well
// day-to-day standards are being kept up, with a little randomness so it's
// never fully predictable.
function averageSatisfaction(staff) {
  const safeStaff = Array.isArray(staff) ? staff : [];
  if (!safeStaff.length) return 50;
  return safeStaff.reduce((sum, person) => sum + Number(person.satisfaction || 0), 0) / safeStaff.length;
}

export const healthInspectionEvent = {
  id: "health_inspection",
  name: "Inspection sanitaire",
  category: "compliance",
  conditions: () => true,
  probability: () => 0.03,
  apply(state, context) {
    const score = averageSatisfaction(state.restaurantState?.staff) + (context.rng() - 0.5) * 30;
    const passed = score >= 55;
    context.variant = { passed };
    return {
      message: passed
        ? "Inspection sanitaire réussie haut la main."
        : "Inspection sanitaire : des non-conformités ont été relevées.",
      severity: passed ? "low" : "high",
    };
  },
  impact: (state, context) => (context.variant?.passed ? { revenue: 0, expenses: 0, staff: 0, reputation: 3 } : { revenue: -150, expenses: 500, staff: 0, reputation: -8 }),
  duration: (state, context) => (context.variant?.passed ? 1 : 3),
};
