import { useCallback, useState } from "react";
import { runProgression } from "../lib/progression";
import { getHotelState } from "../lib/hotelRepository";
import { getRestaurantState } from "../lib/restaurantRepository";
import { listRooms } from "../lib/pmsRepository";

// Drives the progression dashboard: runs the progression pipeline
// (lib/progression/progressionEngine.js) against the current hotel/
// restaurant/PMS state and stores the resulting progressionReport. This is
// the same engine runDailyCycle() runs once a day; this hook lets a page
// preview it on demand without waiting for the next "Jour suivant".
export function useProgression() {
  const [progressionReport, setProgressionReport] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const updateProgression = useCallback(async (overrides = {}) => {
    setIsRunning(true);
    setError(null);
    try {
      const [hotelState, restaurantState, rooms] = await Promise.all([
        overrides.hotelState ?? getHotelState(),
        overrides.restaurantState ?? getRestaurantState(),
        overrides.rooms ?? listRooms(),
      ]);
      const { report } = runProgression({ ...overrides, hotelState, restaurantState, rooms });
      setProgressionReport(report);
      return report;
    } catch (runError) {
      console.error("[useProgression] runProgression failed:", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { updateProgression, progressionReport, isRunning, error };
}
