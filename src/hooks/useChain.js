import { useCallback, useState } from "react";
import {
  addHotel as addHotelToState,
  createChainState,
  createHotel,
  getActiveHotel,
  runChainCycle as runChainCycleEngine,
  setActiveHotel,
} from "../lib/multiHotel";

// Drives the chain dashboard: manages the chain's own client-side state
// (see lib/multiHotel/chainState.js -- today's schema only supports one
// Supabase-backed hotel per user, so every hotel beyond the first exists
// for the current session only) and runs the chain-wide daily cycle
// (lib/multiHotel/chainEngine.js, which runs runDailyCycle() once per
// hotel under the hood).
export function useChain(initialHotels = []) {
  const [chainState, setChainState] = useState(() => createChainState({ hotels: initialHotels }));
  const [chainProgressionState, setChainProgressionState] = useState({});
  const [chainReport, setChainReport] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const addHotel = useCallback((options = {}) => {
    const hotel = createHotel(options);
    setChainState((previous) => addHotelToState(previous, hotel));
    return hotel;
  }, []);

  const switchHotel = useCallback((hotelId) => {
    setChainState((previous) => setActiveHotel(previous, hotelId));
  }, []);

  const runChainCycle = useCallback(
    async (options = {}) => {
      setIsRunning(true);
      setError(null);
      try {
        const { report, hotels, chainProgressionState: nextChainProgressionState } = await runChainCycleEngine({
          hotels: chainState.hotels,
          chainProgressionState,
          ...options,
        });
        setChainState((previous) => ({ ...previous, hotels }));
        setChainProgressionState(nextChainProgressionState);
        setChainReport(report);
        return report;
      } catch (runError) {
        console.error("[useChain] runChainCycle failed:", runError);
        setError(runError);
        throw runError;
      } finally {
        setIsRunning(false);
      }
    },
    [chainState.hotels, chainProgressionState]
  );

  return {
    chainState,
    activeHotel: getActiveHotel(chainState),
    chainReport,
    addHotel,
    switchHotel,
    runChainCycle,
    isRunning,
    error,
  };
}
