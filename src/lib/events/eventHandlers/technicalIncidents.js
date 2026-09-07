// Incidents techniques: a piece of equipment or infrastructure fails.
// Four mutually-exclusive variants (a water leak, a stuck elevator, broken
// AC, or a kitchen equipment failure), each with its own repair cost and
// how long it takes to fix.
import { pickWeighted } from "../eventUtils";

const VARIANTS = [
  { id: "leak", label: "Fuite d'eau", weight: 25, severity: "medium", duration: 2, impact: { revenue: -100, expenses: 400, staff: 0, reputation: -1 } },
  { id: "elevator", label: "Panne d'ascenseur", weight: 25, severity: "medium", duration: 2, impact: { revenue: -150, expenses: 600, staff: 0, reputation: -1 } },
  { id: "ac", label: "Panne de climatisation", weight: 25, severity: "low", duration: 1, impact: { revenue: -50, expenses: 300, staff: 0, reputation: 0 } },
  { id: "kitchen", label: "Panne d'équipement en cuisine", weight: 25, severity: "high", duration: 1, impact: { revenue: -200, expenses: 450, staff: -2, reputation: 0 } },
];

export const technicalIncidentsEvent = {
  id: "technical_incident",
  name: "Incident technique",
  category: "facilities",
  conditions: () => true,
  probability: () => 0.06,
  apply(state, context) {
    context.variant = pickWeighted(VARIANTS.map((variant) => ({ value: variant, weight: variant.weight })), context.rng);
    return { message: `Incident technique : ${context.variant.label.toLowerCase()}.`, severity: context.variant.severity };
  },
  impact: (state, context) => context.variant?.impact,
  duration: (state, context) => context.variant?.duration,
};

export const technicalIncidentVariants = VARIANTS;
