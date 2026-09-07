// An unexpected surge of covers: good for revenue, hard on the kitchen and
// service staff. More likely when the restaurant already has a full menu
// (more reasons for people to come) and few open complaints (word of mouth
// is working in its favor).
function countComplaints(operations) {
  return (Array.isArray(operations) ? operations : []).filter((task) => task.type === "complaint").length;
}

export const restaurantRushEvent = {
  id: "restaurant_rush",
  name: "Rush restaurant",
  category: "restaurant",
  conditions: ({ restaurantState }) => (Array.isArray(restaurantState?.menu) ? restaurantState.menu.length : 0) > 0,
  probability: ({ restaurantState }) => (countComplaints(restaurantState?.operations) === 0 ? 0.18 : 0.1),
  apply: () => ({ message: "Affluence inattendue au restaurant : le service est débordé mais la caisse tourne.", severity: "medium" }),
  impact: { revenue: 300, expenses: 80, staff: -2, reputation: 1 },
  duration: 1,
};
