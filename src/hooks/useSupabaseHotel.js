import { useCallback, useEffect, useState } from "react";
import { getHotelState, saveHotelState } from "../lib/hotelRepository";
import { normalizeHotel } from "../lib/normalizers";
import { mockHotelState } from "../mock/hotel.mock";

export function useSupabaseHotel(initialState) {
  const [data, setData] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // getHotelState() falls back to the localStorage cache when Supabase
      // is unreachable; normalizeHotel repairs anything still malformed.
      const rawState = await getHotelState();
      setData(normalizeHotel(rawState));
      setError(null);
    } catch (loadError) {
      console.error("[useSupabaseHotel] getHotelState failed, falling back to mock data:", loadError);
      setData(normalizeHotel(mockHotelState));
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const persist = useCallback(async (nextState) => {
    setData(nextState);
    try { await saveHotelState(nextState); setError(null); }
    catch (saveError) { setError(saveError); throw saveError; }
  }, []);

  return { data, loading, error, reload, persist };
}
