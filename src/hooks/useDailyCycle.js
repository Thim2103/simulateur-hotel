import { useCallback, useState } from "react";
import { runDailyCycle } from "../lib/dailyCycle";
import { listReservations, listRooms } from "../lib/pmsRepository";

// Drives the "Jour suivant" button: runs the daily cycle pipeline (already
// implemented/tested in lib/dailyCycle, not modified here), then refreshes
// hotel, restaurant, and PMS data so every page reflects what the cycle just
// persisted.
//
// reloadHotel/reloadRestaurant: pass the `reload` from useHotelSimulator()/
// useRestaurantSimulator() so this hook refreshes the *same* hook instance
// the page already renders from, instead of holding its own separate copy
// of that state.
export function useDailyCycle({ reloadHotel, reloadRestaurant } = {}) {
  const [dailyReport, setDailyReport] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);

  // PMS has no dedicated state hook (each page loads its own rooms/
  // reservations on mount via pmsRepository.js), so this hook fetches them
  // directly with the existing, already RLS-scoped repository functions and
  // exposes the result for anything mounted alongside the "Jour suivant"
  // button (e.g. a live preview) -- pages that mount later already get
  // fresh data on their own via their own load effect.
  const refreshPms = useCallback(async () => {
    const [nextRooms, nextReservations] = await Promise.all([listRooms(), listReservations()]);
    setRooms(nextRooms);
    setReservations(nextReservations);
    return { rooms: nextRooms, reservations: nextReservations };
  }, []);

  const advanceDay = useCallback(async () => {
    if (isRunning) return null;
    setIsRunning(true);
    setError(null);
    try {
      const report = await runDailyCycle();
      setDailyReport(report);

      // Refresh hotel, restaurant, and PMS in parallel; a failure in one
      // shouldn't hide the report the pipeline already produced, so log
      // instead of rethrowing.
      await Promise.allSettled([
        typeof reloadHotel === "function" ? reloadHotel() : Promise.resolve(),
        typeof reloadRestaurant === "function" ? reloadRestaurant() : Promise.resolve(),
        refreshPms(),
      ]);

      return report;
    } catch (advanceError) {
      console.error("[useDailyCycle] runDailyCycle failed:", advanceError);
      setError(advanceError);
      throw advanceError;
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, reloadHotel, reloadRestaurant, refreshPms]);

  const dismissReport = useCallback(() => setDailyReport(null), []);

  return { advanceDay, dailyReport, dismissReport, isRunning, error, rooms, reservations, refreshPms };
}
