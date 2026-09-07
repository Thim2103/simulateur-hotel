// 7/30/90-day revenue forecast. next30/next90 come from lib/calculs/rm.js's
// forecastEngine() (seasonality- and occupancy-adjusted); next7 comes from
// forecastAdvanced()'s simpler run-rate model, since forecastEngine doesn't
// expose a 7-day horizon on its own.
import { forecastAdvanced, forecastEngine } from "../calculs/rm";

export function runForecast({ reservations = [], rooms = [], restaurantDemand = 0 } = {}) {
  const safeReservations = Array.isArray(reservations) ? reservations : [];
  const safeRooms = Array.isArray(rooms) ? rooms : [];

  const advanced = forecastAdvanced(safeReservations, restaurantDemand);
  const engine = forecastEngine(safeReservations, safeRooms, restaurantDemand);

  return {
    next7: advanced.next7,
    next30: engine.next30,
    next90: engine.next90,
    dailyRunRate: engine.dailyRunRate,
    seasonality: engine.seasonality,
    daily30: engine.daily30,
    daily90: engine.daily90,
  };
}
