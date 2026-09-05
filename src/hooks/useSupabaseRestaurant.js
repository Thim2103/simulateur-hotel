import { useCallback, useEffect, useState } from "react";
import { getRestaurantState, restaurantRepository, saveRestaurantState } from "../lib/restaurantRepository";

export function useSupabaseRestaurant(initialState) {
  const [data, setData] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await getRestaurantState()); setError(null); }
    catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

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
      setData(await list());
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
      return finance.length ? [finance[0]] : [];
    },
    upsert: restaurantRepository.finance.update,
    remove: restaurantRepository.finance.remove,
  });

  return { ...collection, data: collection.data[0] || initialState };
}

export function useSupabaseOperations(initialState = []) {
  return useSupabaseCollection({ initialState, ...restaurantRepository.operations });
}