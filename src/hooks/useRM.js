import { useCallback, useState } from "react";
import { runRM as runRMEngine } from "../lib/rm";
import { listReservations, listRooms } from "../lib/pmsRepository";

// Drives the RM dashboard: runs the RM pipeline (lib/rm/rmEngine.js) against
// the current PMS state and stores the resulting rmReport. Rooms/
// reservations are loaded directly from pmsRepository.js (already
// user_id/RLS-scoped) unless the caller passes them in explicitly (tests,
// or a caller that already has fresher data -- e.g. runDailyCycle.js, which
// runs the engine itself rather than through this hook).
export function useRM() {
  const [rmReport, setRmReport] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runRM = useCallback(async (overrides = {}) => {
    setIsRunning(true);
    setError(null);
    try {
      const [rooms, reservations] = await Promise.all([
        overrides.rooms ?? listRooms(),
        overrides.reservations ?? listReservations(),
      ]);
      const report = runRMEngine({ ...overrides, rooms, reservations });
      setRmReport(report);
      return report;
    } catch (runError) {
      console.error("[useRM] runRM failed:", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { runRM, rmReport, isRunning, error };
}
