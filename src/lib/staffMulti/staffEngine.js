// Orchestrates multi-site staff management for the chain: morale ->
// transfers -> training -> promotions -> optimization -> regional HR
// events -> StaffReport. Every step is a small pure function in this
// folder; this file only wires them together (see
// lib/multiHotel/chainEngine.js for how it's called once per chain cycle).
import { calculateMorale } from "./staffMorale";
import { applyTransfers, planTransfers } from "./staffTransfer";
import { applyTraining, planTraining } from "./staffTraining";
import { applyPromotions, planPromotions } from "./staffHierarchy";
import { optimizeStaffing } from "./staffOptimization";
import { applyStaffRegionalEvents } from "./staffRegionalEvents";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Applies each hotel's regional-event morale delta across all of its staff.
function applyMoraleAdjustments(hotels, adjustmentsByHotelId) {
  return safeArray(hotels).map((hotel) => {
    const delta = adjustmentsByHotelId[hotel.id];
    if (!delta) return hotel;
    const staff = safeArray(hotel.restaurantState?.staff);
    if (!staff.length) return hotel;
    return {
      ...hotel,
      restaurantState: {
        ...hotel.restaurantState,
        staff: staff.map((person) => ({ ...person, satisfaction: Math.round(clamp(Number(person.satisfaction || 0) + delta, 0, 100)) })),
      },
    };
  });
}

function buildStaffByHotel(hotels) {
  return Object.fromEntries(safeArray(hotels).map((hotel) => [hotel.id, safeArray(hotel.restaurantState?.staff)]));
}

// hotels: the chain's hotel bundles (see lib/multiHotel/hotelFactory.js),
// ideally already updated by today's runDailyCycle() call per hotel.
// Returns { report, hotels }: `report` is the StaffReport; `hotels` are the
// bundles with every staff change (transfers/training/promotions/morale)
// folded in, for the caller to carry into tomorrow's cycle.
export function runStaffEngine({ hotels = [], rng = Math.random } = {}) {
  const safeHotels = safeArray(hotels);

  // 2. Transfers
  const transfers = planTransfers(safeHotels);
  let workingHotels = applyTransfers(safeHotels, transfers);

  // 3. Training
  const training = planTraining(workingHotels);
  workingHotels = applyTraining(workingHotels, training);

  // 4. Promotions
  const promotions = planPromotions(workingHotels);
  workingHotels = applyPromotions(workingHotels, promotions);

  // 5. Optimize staffing between hotels (recommendations, not further moves).
  const optimization = optimizeStaffing(workingHotels, transfers);

  // 6. Regional HR events.
  const { regionalEvents, moraleAdjustmentsByHotelId } = applyStaffRegionalEvents({ hotels: workingHotels, rng });
  workingHotels = applyMoraleAdjustments(workingHotels, moraleAdjustmentsByHotelId);

  // 1. Morale (global + local), reflecting this cycle's transfers/
  // training/promotions/regional events.
  const { moraleGlobal, moraleByHotel } = calculateMorale(workingHotels);

  // 7. StaffReport.
  const report = {
    staffGlobal: workingHotels.flatMap((hotel) => safeArray(hotel.restaurantState?.staff)),
    staffByHotel: buildStaffByHotel(workingHotels),
    moraleGlobal,
    moraleByHotel,
    transfers,
    training,
    promotions,
    optimization,
    regionalEvents,
  };

  return { report, hotels: workingHotels };
}

export const staffEngine = { runStaffEngine };
export default staffEngine;
