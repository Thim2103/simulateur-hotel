import { useCallback, useState } from "react";
import { applyTraining, applyTransfers, planTraining, runStaffEngine } from "../lib/staffMulti";

// Drives the staff dashboard: runs the multi-site staff engine
// (lib/staffMulti/staffEngine.js -- the same one chainEngine.runChainCycle()
// runs once per chain cycle) against a given set of hotels, and exposes
// manual actions (transfer/train one specific staff member right now,
// outside of the automatic per-cycle rebalancing) on top of it.
export function useStaff() {
  const [staffState, setStaffState] = useState({ hotels: [] });
  const [staffReport, setStaffReport] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const setHotels = useCallback((hotels) => {
    setStaffState({ hotels });
  }, []);

  const optimizeStaff = useCallback(
    async (overrides = {}) => {
      setIsRunning(true);
      setError(null);
      try {
        const hotels = overrides.hotels ?? staffState.hotels;
        const { report, hotels: nextHotels } = runStaffEngine({ hotels, ...overrides });
        setStaffState({ hotels: nextHotels });
        setStaffReport(report);
        return report;
      } catch (runError) {
        console.error("[useStaff] optimizeStaff failed:", runError);
        setError(runError);
        throw runError;
      } finally {
        setIsRunning(false);
      }
    },
    [staffState.hotels]
  );

  // Moves one specific staff member to another hotel right now, outside of
  // the automatic per-cycle rebalancing (see staffTransfer.js).
  const transferStaff = useCallback((staffId, fromHotelId, toHotelId) => {
    setStaffState((previous) => ({
      hotels: applyTransfers(previous.hotels, [{ staffId, fromHotelId, toHotelId }]),
    }));
  }, []);

  // Trains one specific staff member right now (see staffTraining.js).
  const trainStaff = useCallback((staffId, hotelId) => {
    setStaffState((previous) => {
      const hotel = previous.hotels.find((entry) => entry.id === hotelId);
      const person = hotel?.restaurantState?.staff?.find((entry) => entry.id === staffId);
      if (!person) return previous;
      const [record] = planTraining([{ id: hotelId, restaurantState: { staff: [person] } }], { maxPerHotel: 1 });
      if (!record) return previous;
      return { hotels: applyTraining(previous.hotels, [record]) };
    });
  }, []);

  return {
    staffState,
    setHotels,
    staffReport,
    transferStaff,
    trainStaff,
    optimizeStaff,
    isRunning,
    error,
  };
}
