// Recommended ADR for tomorrow, nudged up or down from the blended ADR by
// three independent adjustments: how full the hotel already is, today's
// weather, and any demand-boosting event in progress (see lib/events/).
import { adr as blendedAdr } from "../calculs/rm";

const MIN_PRICE_FACTOR = 0.7; // floor: never discount more than 30% off blended ADR
const MAX_PRICE_FACTOR = 1.5; // ceiling: never charge more than 50% over blended ADR
const HIGH_OCCUPANCY_THRESHOLD = 80;
const LOW_OCCUPANCY_THRESHOLD = 40;
const OCCUPANCY_ADJUSTMENT = 0.08;
const WEATHER_ADJUSTMENT = 0.03;
const EVENT_ADJUSTMENT_PER_EVENT = 0.05;
const MAX_EVENT_ADJUSTMENT = 0.15;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

// A fuller hotel can command a higher rate; a quiet one should discount to
// stimulate demand.
function occupancyAdjustment(occupancy) {
  if (occupancy > HIGH_OCCUPANCY_THRESHOLD) return OCCUPANCY_ADJUSTMENT;
  if (occupancy < LOW_OCCUPANCY_THRESHOLD) return -OCCUPANCY_ADJUSTMENT;
  return 0;
}

// Today's active weather event (see eventHandlers/weather.js) already
// carries a revenue impact sign; ride that same direction for pricing.
function weatherAdjustment(activeEvents) {
  const weather = activeEvents.find((event) => event.id === "weather");
  const revenueImpact = Number(weather?.impact?.revenue || 0);
  if (revenueImpact > 0) return WEATHER_ADJUSTMENT;
  if (revenueImpact < 0) return -WEATHER_ADJUSTMENT;
  return 0;
}

// A local event or a VIP guest in progress means extra demand in town:
// capture some of that value rather than leaving it on the table.
function eventAdjustment(activeEvents) {
  const demandBoosters = activeEvents.filter(
    (event) => ["local_event", "vip_guest"].includes(event.id) && Number(event.impact?.revenue || 0) > 0
  );
  return Math.min(MAX_EVENT_ADJUSTMENT, demandBoosters.length * EVENT_ADJUSTMENT_PER_EVENT);
}

export function runDynamicPricing({ reservations = [], occupancy = 50, activeEvents = [] } = {}) {
  const safeReservations = Array.isArray(reservations) ? reservations : [];
  const safeActiveEvents = safeArray(activeEvents);

  const baseAdr = blendedAdr(safeReservations);
  const occAdjustment = occupancyAdjustment(occupancy);
  const weatherAdj = weatherAdjustment(safeActiveEvents);
  const eventAdj = eventAdjustment(safeActiveEvents);
  const totalAdjustment = occAdjustment + weatherAdj + eventAdj;

  return {
    recommendedADR: Math.round(baseAdr * (1 + totalAdjustment)),
    minPrice: Math.round(baseAdr * MIN_PRICE_FACTOR),
    maxPrice: Math.round(baseAdr * MAX_PRICE_FACTOR),
    eventAdjustment: Number(eventAdj.toFixed(2)),
    weatherAdjustment: Number(weatherAdj.toFixed(2)),
    occupancyAdjustment: Number(occAdjustment.toFixed(2)),
  };
}
