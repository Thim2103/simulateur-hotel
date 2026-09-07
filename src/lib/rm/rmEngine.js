// Orchestrates the RM pipeline: segmentation -> pickup -> forecast ->
// dynamicPricing -> rmRecommendations -> rmReport. Every step is a small
// pure function in this folder; this file only wires them together (see
// lib/dailyCycle/runDailyCycle.js for how it's called once a day).
import { occupationRate, pickupTrend as computePickupTrend } from "../calculs/rm";
import { runSegmentation } from "./segmentation";
import { runPickup } from "./pickup";
import { runForecast } from "./forecast";
import { runDynamicPricing } from "./dynamicPricing";
import { runRecommendations } from "./rmRecommendations";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

function sumByDay(byDay) {
  return Object.values(byDay || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

// rooms/reservations: the PMS state. restaurantDemand: today's restaurant
// demand indicator (0-100), used to lean the forecast toward the
// hotel+restaurant's combined momentum. activeEvents: today's events from
// lib/events/eventEngine.js (weather/local events/VIP feed into pricing).
export function runRM({ rooms = [], reservations = [], restaurantDemand = 0, activeEvents = [], referenceDate = new Date() } = {}) {
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeReservations = Array.isArray(reservations) ? reservations : [];
  const occupancy = occupationRate(safeRooms, safeReservations);

  // 1. Segmentation
  const segmentationResult = runSegmentation({ reservations: safeReservations, occupancy });

  // 2. Pickup
  const pickupResult = runPickup({ reservations: safeReservations });

  // 3. Forecast
  const forecastResult = runForecast({ reservations: safeReservations, rooms: safeRooms, restaurantDemand });

  // 4. Dynamic pricing
  const pricingResult = runDynamicPricing({ reservations: safeReservations, occupancy, activeEvents });

  // 5. Recommendations
  const trend = computePickupTrend(safeReservations);
  const recommendations = runRecommendations({
    pickupTrend: trend,
    pricing: pricingResult,
    segmentation: segmentationResult,
    occupancy,
  });

  const pickupBySegmentTotals = Object.fromEntries(
    Object.entries(pickupResult.bySegment).map(([segment, byDay]) => [segment, sumByDay(byDay)])
  );

  // 6. rmReport
  return {
    date: toDateOnly(referenceDate),
    forecast: { next7: forecastResult.next7, next30: forecastResult.next30, next90: forecastResult.next90, daily30: forecastResult.daily30, daily90: forecastResult.daily90 },
    pickup: { daily: pickupResult.daily, bySegment: pickupResult.bySegment, byChannel: pickupResult.byChannel, trend },
    pricing: pricingResult,
    segmentation: {
      mix: segmentationResult.mix,
      adrBySegment: segmentationResult.adrBySegment,
      pickupBySegment: pickupBySegmentTotals,
    },
    recommendations,
  };
}

export const rmEngine = { runRM };
export default rmEngine;
