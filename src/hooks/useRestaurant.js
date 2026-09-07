import { useCallback, useState } from "react";
import { getRestaurantState, saveRestaurantState } from "../lib/restaurantRepository";
import {
  createInitialRestaurantState,
  markRestaurantReady,
  runRestaurantCycle as runRestaurantCycleEngine,
  validateRestaurantStructure as validateStructure,
} from "../lib/restaurant";

// Drives the restaurant module end to end: loads the real Supabase state
// (no offline/mock fallback -- a load failure surfaces as `error`, it does
// not silently swap in fake data), lets the "Structure de l'établissement"
// form validate and submit itself, and runs the restaurant engine
// (lib/restaurant/restaurantEngine.js) for a same-page preview cycle.
// The authoritative daily cycle for a persisted hotel still runs through
// runDailyCycle()/useDailyCycle -- this hook's runRestaurantCycle() is for
// dashboards that want to preview the engine against the current state.
export function useRestaurant() {
  const [restaurantState, setRestaurantState] = useState(null);
  const [restaurantReport, setRestaurantReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRestaurantState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await getRestaurantState();
      setRestaurantState(state);
      return state;
    } catch (loadError) {
      console.error("[useRestaurant] loadRestaurantState failed:", loadError);
      setError(loadError);
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);

  // Validates either the current state's structure, or a candidate object
  // (used by the Structure form before it has been saved to state).
  const validateRestaurantStructure = useCallback(
    (structure) => validateStructure(structure ?? restaurantState?.structure),
    [restaurantState]
  );

  // Shallow-merges a change into one top-level section of the state (e.g.
  // updateRestaurantField("structure", { capacity: 40 })), the same shape
  // every Restaurant* page's updateStructure/updateFinance/... already use.
  const updateRestaurantField = useCallback((section, changes) => {
    setRestaurantState((previous) => {
      const base = previous || createInitialRestaurantState();
      const current = base[section];
      const next = current && typeof current === "object" && !Array.isArray(current) ? { ...current, ...changes } : changes;
      return { ...base, [section]: next };
    });
  }, []);

  // Validates and persists the Structure form: writes the restaurant profile
  // (restaurants/restaurant_finance/restaurant_menu_items/restaurant_staff/
  // restaurant_operations, via saveRestaurantState()) and marks
  // progression.ready = true so the rest of the module's tabs unlock.
  const submitStructure = useCallback(
    async (structure) => {
      const result = validateStructure(structure);
      if (!result.valid) return result;

      setLoading(true);
      setError(null);
      try {
        const base = restaurantState || createInitialRestaurantState();
        const nextState = markRestaurantReady({ ...base, structure: { ...base.structure, ...structure } });
        await saveRestaurantState(nextState);
        setRestaurantState(nextState);
        return { valid: true, errors: [] };
      } catch (saveError) {
        console.error("[useRestaurant] submitStructure failed:", saveError);
        setError(saveError);
        throw saveError;
      } finally {
        setLoading(false);
      }
    },
    [restaurantState]
  );

  const runRestaurantCycle = useCallback(
    (overrides = {}) => {
      const { report, restaurantState: nextState } = runRestaurantCycleEngine({
        restaurantState: overrides.restaurantState ?? restaurantState,
        ...overrides,
      });
      setRestaurantState(nextState);
      setRestaurantReport(report);
      return report;
    },
    [restaurantState]
  );

  return {
    restaurantState,
    restaurantReport,
    loading,
    error,
    loadRestaurantState,
    validateRestaurantStructure,
    updateRestaurantField,
    submitStructure,
    runRestaurantCycle,
  };
}
