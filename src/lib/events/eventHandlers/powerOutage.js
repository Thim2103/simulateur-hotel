// A power outage disrupts both the hotel and the restaurant for the day:
// lost revenue from guests who can't be served properly, plus the cost of
// getting the electrician out / running a generator.
export const powerOutageEvent = {
  id: "power_outage",
  name: "Panne électrique",
  category: "facilities",
  conditions: () => true,
  probability: () => 0.04,
  apply: () => ({ message: "Coupure de courant : intervention électrique en urgence.", severity: "high" }),
  impact: { revenue: -200, expenses: 350, staff: -1, reputation: -1 },
  duration: 1,
};
