// Local events (a festival, a professional conference, a major sports
// match) bring extra visitors into town for a few days, boosting both the
// hotel and the restaurant.
import { pickWeighted } from "../eventUtils";

const VARIANTS = [
  { id: "festival", label: "Festival local", weight: 40, severity: "low", duration: 3, impact: { revenue: 400, expenses: 50, staff: -1, reputation: 1 } },
  { id: "conference", label: "Conférence professionnelle en ville", weight: 35, severity: "low", duration: 2, impact: { revenue: 500, expenses: 0, staff: 0, reputation: 0 } },
  { id: "match", label: "Match sportif majeur", weight: 25, severity: "low", duration: 1, impact: { revenue: 250, expenses: 0, staff: 0, reputation: 0 } },
];

export const localEventsEvent = {
  id: "local_event",
  name: "Événement local",
  category: "environment",
  conditions: () => true,
  probability: () => 0.1,
  apply(state, context) {
    context.variant = pickWeighted(VARIANTS.map((variant) => ({ value: variant, weight: variant.weight })), context.rng);
    return { message: `Événement local : ${context.variant.label.toLowerCase()} attire des visiteurs.`, severity: context.variant.severity };
  },
  impact: (state, context) => context.variant?.impact,
  duration: (state, context) => context.variant?.duration,
};

export const localEventVariants = VARIANTS;
