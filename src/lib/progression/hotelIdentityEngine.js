// The hotel's own dynamic IDENTITY (Étape 6): a title, a one-line pitch
// and a synthesis (strengths, weaknesses, target segments) computed
// purely from which positioning axes the player has actually invested in
// (lib/progression/positioningEngine.js's own installedAxes()) -- never
// stored, always recomputed, so it can never drift from the player's own
// choices. A hotel that never invested reads as "Auberge Traditionnelle"
// -- "Ma Première Auberge" 's own starting identity (Étape 3).
import { AXES, installedAxes, computePositioningEffects } from "./positioningEngine";
import { segmentById } from "../data/segments/segments";

export const DEFAULT_TITLE = "Auberge Traditionnelle";

const SINGLE_AXIS_TITLES = {
  eco: "Auberge Écoresponsable",
  boutique: "Boutique Hôtel",
  gastronomy: "Maison Gastronomique",
  family: "Auberge Familiale",
  business: "Hôtel d'Affaires",
};

// A handful of named combinations the spec calls out explicitly; any
// other pair falls back to joining both axis labels rather than needing
// every one of the 10 possible pairs pre-written by hand.
const COMBINATION_TITLES = {
  "boutique+eco": "Éco-Boutique Hôtel",
  "boutique+gastronomy": "Maison Gastronomique de Charme",
  "boutique+business": "Boutique Hôtel d'Affaires",
  "eco+family": "Auberge Familiale Écoresponsable",
  "business+gastronomy": "Maison Gastronomique d'Affaires",
};

function titleFor(activeAxes) {
  if (activeAxes.length === 0) return DEFAULT_TITLE;
  if (activeAxes.length === 1) return SINGLE_AXIS_TITLES[activeAxes[0]];
  const key = activeAxes.slice(0, 2).sort().join("+");
  return COMBINATION_TITLES[key] || activeAxes.slice(0, 2).map((axisId) => AXES[axisId].label).join(" & ");
}

// The guest segments the hotel now appeals to most, most-attracted first
// (computePositioningEffects()'s own segmentAttraction, already counted
// per invested tier).
function targetSegments(hotelState) {
  const { segmentAttraction } = computePositioningEffects(hotelState);
  return Object.entries(segmentAttraction)
    .sort((a, b) => b[1] - a[1])
    .map(([segmentId]) => segmentById(segmentId))
    .filter(Boolean);
}

// { title, axes, strengths, weaknesses, targetSegments, reputationBonus }
// -- axes is the raw list of active axis ids (installedAxes()); strengths
// names what was actually invested in, weaknesses names the orientations
// still untouched (a real gap, not a fabricated flaw).
export function hotelIdentity(hotelState) {
  const activeAxes = installedAxes(hotelState);
  const { reputationBonus } = computePositioningEffects(hotelState);

  return {
    title: titleFor(activeAxes),
    axes: activeAxes,
    strengths: activeAxes.map((axisId) => `${AXES[axisId].icon} ${AXES[axisId].label}`),
    weaknesses: Object.keys(AXES)
      .filter((axisId) => !activeAxes.includes(axisId))
      .map((axisId) => `${AXES[axisId].icon} ${AXES[axisId].label} (non exploité)`),
    targetSegments: targetSegments(hotelState),
    reputationBonus,
  };
}

export default hotelIdentity;
