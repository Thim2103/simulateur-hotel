// ESG diagnostics -- same anomaly/error/opportunity vocabulary
// lib/finance/financeDiagnostics.js/lib/staff/staffDiagnostics.js/
// lib/marketing/marketingDiagnostics.js already use, applied to one ESG
// cycle's own numbers. See esgEngine.js's esgDiagnosticsToAnalytics() for
// how these fold into the Analytics module's own diagnostics list.
import { safeNumber } from "../safe";

const DIAGNOSTIC_TYPES = ["anomaly", "error", "opportunity"];

function diagnostic(type, severity, message) {
  return { type: DIAGNOSTIC_TYPES.includes(type) ? type : "anomaly", severity, message };
}

const HIGH_ENERGY_PER_ROOM = 35; // kWh/room-night, above this is wasteful
const HIGH_WATER_PER_ROOM = 0.5; // m³/room-night
const HIGH_CO2 = 500; // kg/cycle, above this is a real concern for a small property

export function generateEsgDiagnostics({ energy, water, waste, co2, score, staffOverload, roomCount, nextCertification } = {}) {
  const diagnostics = [];
  const rooms = Math.max(1, safeNumber(roomCount, 1));
  const energyPerRoom = safeNumber(energy, 0) / rooms;
  const waterPerRoom = safeNumber(water, 0) / rooms;

  if (energyPerRoom > HIGH_ENERGY_PER_ROOM * 1.3) {
    diagnostics.push(diagnostic("error", "high", `Consommation énergétique très élevée (${Math.round(energyPerRoom)} kWh/chambre) : risque de surcoût et d'image négative.`));
  } else if (energyPerRoom > HIGH_ENERGY_PER_ROOM) {
    diagnostics.push(diagnostic("anomaly", "medium", `Consommation énergétique élevée (${Math.round(energyPerRoom)} kWh/chambre).`));
  }

  if (waterPerRoom > HIGH_WATER_PER_ROOM * 1.3) {
    diagnostics.push(diagnostic("error", "high", `Consommation d'eau très élevée (${waterPerRoom.toFixed(2)} m³/chambre).`));
  } else if (waterPerRoom > HIGH_WATER_PER_ROOM) {
    diagnostics.push(diagnostic("anomaly", "medium", `Consommation d'eau élevée (${waterPerRoom.toFixed(2)} m³/chambre).`));
  }

  if (safeNumber(co2, 0) > HIGH_CO2) {
    diagnostics.push(diagnostic("anomaly", "medium", `Émissions de CO₂ élevées (${co2} kg ce cycle) : envisager de réduire l'énergie ou les déchets.`));
  }

  const scoreValue = safeNumber(score, 0);
  if (scoreValue < 40) {
    diagnostics.push(diagnostic("error", "high", `Score ESG critique (${scoreValue}/100) : impact direct sur la réputation et l'accès aux certifications.`));
  } else if (scoreValue < 55) {
    diagnostics.push(diagnostic("anomaly", "medium", `Score ESG moyen (${scoreValue}/100).`));
  }

  if (safeNumber(staffOverload, 0) > 120) {
    diagnostics.push(diagnostic("anomaly", "medium", `Surcharge de l'équipe (${staffOverload}%) : le bien-être du personnel, qui alimente le score ESG, risque de se dégrader.`));
  }

  if (nextCertification?.eligible) {
    diagnostics.push(diagnostic("opportunity", "low", `Certification "${nextCertification.name}" à portée de main : toutes les conditions sont réunies.`));
  } else if (nextCertification && nextCertification.progress >= 60) {
    diagnostics.push(diagnostic("opportunity", "low", `Certification "${nextCertification.name}" en bonne voie (${nextCertification.progress}%).`));
  }

  if (scoreValue >= 75 && waste !== undefined && waste !== null) {
    diagnostics.push(diagnostic("opportunity", "low", `Démarche ESG solide (${scoreValue}/100) : bon moment pour communiquer sur la réputation durable auprès du Marketing.`));
  }

  return diagnostics;
}
