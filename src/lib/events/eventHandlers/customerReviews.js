// A customer review goes up online. Whether it's glowing or scathing leans
// heavily on how many open complaints the restaurant currently has.
import { pickWeighted } from "../eventUtils";

function countComplaints(operations) {
  return (Array.isArray(operations) ? operations : []).filter((task) => task.type === "complaint").length;
}

const POSITIVE = { id: "positive", severity: "low", message: "Un excellent avis client vient d'être publié en ligne.", impact: { revenue: 50, expenses: 0, staff: 1, reputation: 3 } };
const NEGATIVE = { id: "negative", severity: "medium", message: "Un avis client négatif vient d'être publié en ligne.", impact: { revenue: -60, expenses: 0, staff: -1, reputation: -4 } };

export const customerReviewsEvent = {
  id: "customer_review",
  name: "Avis client",
  category: "reputation",
  conditions: () => true,
  probability: () => 0.2,
  apply(state, context) {
    const complaints = countComplaints(state.restaurantState?.operations);
    const positiveWeight = complaints === 0 ? 80 : 25;
    const negativeWeight = complaints === 0 ? 20 : 75;
    context.variant = pickWeighted(
      [{ value: POSITIVE, weight: positiveWeight }, { value: NEGATIVE, weight: negativeWeight }],
      context.rng
    );
    return { message: context.variant.message, severity: context.variant.severity };
  },
  impact: (state, context) => context.variant?.impact,
  duration: 1,
};
