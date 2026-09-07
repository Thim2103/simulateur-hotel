// Météo: one of four mutually-exclusive variants per occurrence. Most days
// are unremarkable (see `probability`); this only fires for weather that's
// notable enough to move the numbers.
import { pickWeighted } from "../eventUtils";

const VARIANTS = [
  { id: "sun", label: "Grand soleil", weight: 45, severity: "low", duration: 1, impact: { revenue: 120, expenses: 0, staff: 1, reputation: 1 } },
  { id: "rain", label: "Pluie continue", weight: 30, severity: "low", duration: 1, impact: { revenue: -80, expenses: 0, staff: -1, reputation: 0 } },
  { id: "heatwave", label: "Canicule", weight: 15, severity: "medium", duration: 3, impact: { revenue: 60, expenses: 180, staff: -3, reputation: 0 } },
  { id: "storm", label: "Tempête", weight: 10, severity: "high", duration: 2, impact: { revenue: -250, expenses: 300, staff: -2, reputation: -1 } },
];

export const weatherEvent = {
  id: "weather",
  name: "Météo",
  category: "environment",
  probability: () => 0.35,
  conditions: () => true,
  apply(state, context) {
    context.variant = pickWeighted(VARIANTS.map((variant) => ({ value: variant, weight: variant.weight })), context.rng);
    return {
      message: `Météo du jour : ${context.variant.label.toLowerCase()}.`,
      severity: context.variant.severity,
    };
  },
  impact: (state, context) => context.variant?.impact,
  duration: (state, context) => context.variant?.duration,
};

export const weatherVariants = VARIANTS;
