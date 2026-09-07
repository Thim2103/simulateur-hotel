import { useCallback, useEffect, useState } from "react";
import { getRestaurantState, restaurantRepository, saveRestaurantState } from "../lib/restaurantRepository";
import { normalizeRestaurant } from "../lib/normalizers";
import { mockRestaurantState } from "../mock/restaurant.mock";
import { runRestaurantSchemaDiagnostics } from "../lib/restaurantSchemaSync";

let schemaDiagnosticsPromise;

function startSchemaDiagnostics() {
  if (!schemaDiagnosticsPromise) {
    schemaDiagnosticsPromise = runRestaurantSchemaDiagnostics().catch((diagnosticError) => {
      console.warn("[useSupabaseRestaurant] Unable to inspect restaurant schema:", diagnosticError);
      return null;
    });
  }
  return schemaDiagnosticsPromise;
}

export function useSupabaseRestaurant(initialState) {
  const [data, setData] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // getRestaurantState() is resilient to per-table/per-field failures
      // (see restaurantRepository.js); normalizeRestaurant repairs anything
      // that still slips through (nulls, malformed JSON, wrong types, etc.).
      const rawState = await getRestaurantState();
      setData(normalizeRestaurant(rawState));
      setError(null);
    } catch (loadError) {
      console.error("[useSupabaseRestaurant] getRestaurantState failed, falling back to mock data:", loadError);
      // Genuine/unexpected failure: fall back to mock data so the simulator
      // remains usable offline, while still surfacing the error.
      setData(normalizeRestaurant(mockRestaurantState));
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { startSchemaDiagnostics(); }, []);

  const persist = useCallback(async (nextState) => {
    setData(nextState);
    try { await saveRestaurantState(nextState); setError(null); }
    catch (saveError) { setError(saveError); throw saveError; }
  }, []);

  return { data, loading, error, reload, persist, repository: restaurantRepository };
}

function useSupabaseCollection({ initialState, list, upsert, remove }) {
  const [data, setData] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await list();
      setData(Array.isArray(result) ? result : []);
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async (item) => {
    try {
      const saved = await upsert(item);
      setData((current) => {
        const withoutSaved = current.filter((entry) => String(entry.id) !== String(saved.id));
        return [...withoutSaved, saved];
      });
      setError(null);
      return saved;
    } catch (saveError) {
      setError(saveError);
      throw saveError;
    }
  }, [upsert]);

  const deleteItem = useCallback(async (id) => {
    try {
      await remove(id);
      setData((current) => current.filter((entry) => String(entry.id) !== String(id)));
      setError(null);
    } catch (removeError) {
      setError(removeError);
      throw removeError;
    }
  }, [remove]);

  return { data, loading, error, reload, create: save, update: save, remove: deleteItem };
}

export function useSupabaseStaff(initialState = []) {
  return useSupabaseCollection({ initialState, ...restaurantRepository.staff });
}

export function useSupabaseMenu(initialState = []) {
  return useSupabaseCollection({ initialState, ...restaurantRepository.menu });
}

export function useSupabaseFinance(initialState = {}) {
  const collection = useSupabaseCollection({
    initialState: [initialState],
    list: async () => {
      const finance = await restaurantRepository.finance.get();
      return Array.isArray(finance) ? finance : [];
    },
    upsert: restaurantRepository.finance.update,
    remove: restaurantRepository.finance.remove,
  });

  return { ...collection, data: collection.data[0] || initialState };
}

export function useSupabaseOperations(initialState = []) {
  return useSupabaseCollection({ initialState, ...restaurantRepository.operations });
}