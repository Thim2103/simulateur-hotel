import { useCallback, useState } from "react";
import { getRestaurantState, saveRestaurantState } from "../lib/restaurantRepository";
import {
  createInitialRestaurantState,
  markRestaurantReady,
  runRestaurantCycle as runRestaurantCycleEngine,
  validateRestaurantStructure as validateStructure,
} from "../lib/restaurant";
import { useSupabaseSession } from "./useSupabaseSession";
import { createGuestHotelBundle, createGuestRepository } from "../lib/guest";

// One localStorage slot for the whole restaurant state -- stateless
// factory, safe to build once at module scope (see lib/guest/guestAdapter.js).
const guestRestaurantRepository = createGuestRepository("restaurant", { defaultState: null });

// Drives the restaurant module end to end. In guest mode (see
// hooks/useSupabaseSession.js -- no Supabase session, no anonymous auth
// available) this bypasses restaurantRepository.js entirely and reads/
// writes lib/guest/'s localStorage-backed state instead, seeded with a
// ready-to-play establishment on first load; a real Supabase session
// keeps the existing behaviour unchanged (no offline/mock fallback -- a
// load failure surfaces as `error`). Lets the "Structure de
// l'établissement" form validate and submit itself, and runs the
// restaurant engine (lib/restaurant/restaurantEngine.js) for a same-page
// preview cycle. The authoritative daily cycle for a persisted hotel
// still runs through runDailyCycle()/useDailyCycle -- this hook's
// runRestaurantCycle() is for dashboards that want to preview the engine
// against the current state.
//
// Every async action resolves the session itself (via resolveSession(),
// useSupabaseSession()'s `reload`) instead of trusting the `isGuest`
// closed over at render time -- see useCareer.js's docstring for why:
// a mount-time load can otherwise run before the guest fallback has
// resolved and wrongly hit Supabase.
export function useRestaurant() {
  const { session, reload: resolveSession } = useSupabaseSession();
  const isGuest = session?.mode === "guest";

  const [restaurantState, setRestaurantState] = useState(null);
  const [restaurantReport, setRestaurantReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRestaurantState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const guestNow = (await resolveSession())?.mode === "guest";
      if (guestNow) {
        const existing = await guestRestaurantRepository.get();
        const state = existing || createGuestHotelBundle().restaurantState;
        if (!existing) await guestRestaurantRepository.save(state);
        setRestaurantState(state);
        return state;
      }
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
  }, [resolveSession]);

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

  // Validates and persists the Structure form: writes the restaurant
  // profile (via saveRestaurantState() for a real session, or
  // guestRestaurantRepository for a guest one) and marks
  // progression.ready = true so the rest of the module's tabs unlock.
  const submitStructure = useCallback(
    async (structure) => {
      const result = validateStructure(structure);
      if (!result.valid) return result;

      setLoading(true);
      setError(null);
      try {
        const guestNow = (await resolveSession())?.mode === "guest";
        const base = restaurantState || createInitialRestaurantState();
        const nextState = markRestaurantReady({ ...base, structure: { ...base.structure, ...structure } });
        if (guestNow) {
          await guestRestaurantRepository.save(nextState);
        } else {
          await saveRestaurantState(nextState);
        }
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
    [restaurantState, resolveSession]
  );

  const runRestaurantCycle = useCallback(
    (overrides = {}) => {
      const { report, restaurantState: nextState } = runRestaurantCycleEngine({
        restaurantState: overrides.restaurantState ?? restaurantState,
        ...overrides,
      });
      setRestaurantState(nextState);
      setRestaurantReport(report);
      if (isGuest) guestRestaurantRepository.save(nextState).catch(() => undefined);
      return report;
    },
    [restaurantState, isGuest]
  );

  return {
    restaurantState,
    restaurantReport,
    loading,
    error,
    isGuest,
    loadRestaurantState,
    validateRestaurantStructure,
    updateRestaurantField,
    submitStructure,
    runRestaurantCycle,
  };
}
