// Pure ESG calculations: energy (kWh), water (m³), waste (kg), CO₂ (kg),
// and the overall ESG score. Operates on the same hotel bundle every
// other engine in this app shares ({ hotelState, restaurantState, rooms,
// reservations } -- see lib/guest/guestAdapter.js's
// createGuestHotelBundle()).
//
// Model note: like lib/finance/financeCalculations.js and
// lib/staff/staffCalculations.js, this is a simulator, not a real energy/
// water meter -- there is no sub-metered consumption anywhere else in
// the app. hotelState.esg/restaurantState.esg already track 0-100
// "efficiency" scores (energyConsumption, waterUsage, wasteReduction,
// energyEfficiency -- see lib/hotel.js/lib/legacyRestaurantSimulator.js);
// this module converts those scores, combined with real occupancy/
// covers from PMS/Restaurant, into plausible physical units. Every
// constant below is a deliberate, disclosed assumption.
import { safeArray, safeNumber, safeObject } from "../safe";

const BASE_ENERGY_KWH_PER_ROOM_NIGHT = 25;
const BASE_ENERGY_KWH_PER_COVER = 3;
const BASE_WATER_M3_PER_ROOM_NIGHT = 0.35;
const BASE_WATER_M3_PER_COVER = 0.05;
const BASE_WASTE_KG_PER_ROOM_NIGHT = 2;
const BASE_WASTE_KG_PER_COVER = 0.4;
const CO2_KG_PER_KWH = 0.42; // grid average emission factor
const CO2_KG_PER_KG_WASTE = 0.5; // landfill/incineration-equivalent factor
const ENERGY_COST_PER_KWH = 0.22; // €
const WATER_COST_PER_M3 = 4.5; // €
const WASTE_COST_PER_KG = 0.18; // €

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function score01(value, fallback) {
  return clamp(safeNumber(value, fallback), 0, 100) / 100;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// 1. Énergie (kWh): scales the baseline per room-night/cover by the
// property's own energyConsumption score (hotel) and energyEfficiency
// score (restaurant, inverted -- higher efficiency means less energy).
export function computeEnergyConsumption({ occupiedRoomNights = 0, covers = 0, hotelEsg, restaurantEsg } = {}) {
  const hotelIntensity = score01(safeObject(hotelEsg).energyConsumption, 60);
  const restaurantIntensity = 1 - score01(safeObject(restaurantEsg).energyEfficiency, 50);
  const hotelEnergy = occupiedRoomNights * BASE_ENERGY_KWH_PER_ROOM_NIGHT * (0.5 + hotelIntensity);
  const restaurantEnergy = covers * BASE_ENERGY_KWH_PER_COVER * (0.5 + restaurantIntensity);
  return Math.round(hotelEnergy + restaurantEnergy);
}

// 2. Eau (m³): same shape, driven by the hotel's waterUsage score.
export function computeWaterConsumption({ occupiedRoomNights = 0, covers = 0, hotelEsg } = {}) {
  const hotelIntensity = score01(safeObject(hotelEsg).waterUsage, 55);
  const water = occupiedRoomNights * BASE_WATER_M3_PER_ROOM_NIGHT * (0.5 + hotelIntensity) + covers * BASE_WATER_M3_PER_COVER;
  return round2(water);
}

// 3. Déchets (kg): driven by both properties' wasteReduction scores
// (higher reduction -> less waste generated).
export function computeWasteGenerated({ occupiedRoomNights = 0, covers = 0, hotelEsg, restaurantEsg } = {}) {
  const hotelWasteFactor = 1 - score01(safeObject(hotelEsg).wasteReduction, 40);
  const restaurantWasteFactor = 1 - score01(safeObject(restaurantEsg).wasteReduction, 35);
  const hotelWaste = occupiedRoomNights * BASE_WASTE_KG_PER_ROOM_NIGHT * (0.3 + hotelWasteFactor);
  const restaurantWaste = covers * BASE_WASTE_KG_PER_COVER * (0.3 + restaurantWasteFactor);
  return Math.round(hotelWaste + restaurantWaste);
}

// 4. CO₂ (kg): energy's own emission factor plus waste's landfill-
// equivalent factor -- "calculer CO₂" (section 1).
export function computeCO2Emissions({ energyKwh = 0, wasteKg = 0 } = {}) {
  return Math.round(energyKwh * CO2_KG_PER_KWH + wasteKg * CO2_KG_PER_KG_WASTE);
}

// 5. Coûts énergie/eau/déchets -- "synchroniser avec Finance (coûts
// énergie/eau/déchets) -> EBITDA" (section 5): a plausible cost
// translation of the physical units above, informational here (Finance's
// own fixedCosts are only nudged by the reduce-* actions, see
// esgActions.js, not silently rewritten every cycle).
export function computeEsgCosts({ energyKwh = 0, waterM3 = 0, wasteKg = 0 } = {}) {
  const energy = Math.round(energyKwh * ENERGY_COST_PER_KWH);
  const water = Math.round(waterM3 * WATER_COST_PER_M3);
  const waste = Math.round(wasteKg * WASTE_COST_PER_KG);
  return { energy, water, waste, total: energy + water + waste };
}

// 6. Score ESG global: blends the property's own declared sustainability
// score with staff wellbeing (restaurantState.esg.staffWellbeing) and
// today's real staff morale when available -- "synchroniser avec Staff
// (bien-être, surcharge)" (section 5): sustained overload erodes the
// wellbeing contribution.
export function computeEsgScore({ hotelEsg, restaurantEsg, staffMorale = null, staffOverload = 0, certificationsCount = 0 } = {}) {
  const sustainability = safeNumber(safeObject(hotelEsg).sustainabilityScore, 50);
  const wellbeing = safeNumber(safeObject(restaurantEsg).staffWellbeing, 60);
  const moraleBlend = staffMorale !== null && staffMorale !== undefined ? wellbeing * 0.5 + safeNumber(staffMorale, wellbeing) * 0.5 : wellbeing;
  const overloadPenalty = Math.max(0, safeNumber(staffOverload, 0) - 100) * 0.1;
  const certificationBonus = Math.min(15, safeNumber(certificationsCount, 0) * 5);

  const score = sustainability * 0.6 + moraleBlend * 0.25 + certificationBonus - overloadPenalty;
  return Math.round(clamp(score, 0, 100));
}

export function averageMenuSales(menu) {
  return safeArray(menu).reduce((total, item) => total + safeNumber(item.sales, 0), 0);
}
