import { useCallback, useState } from "react";
import {
  createGuestSession as createGuestSessionPure,
  loadGuestSession as loadGuestSessionPure,
  resetGuestSession as resetGuestSessionPure,
} from "../lib/guest/guestSession";
import { loadGuestState as loadGuestStatePure, saveGuestState as saveGuestStatePure } from "../lib/guest/guestState";

// A thin, React-friendly wrapper around lib/guest/ -- GuestMode.jsx uses
// createGuestSession() to start playing without Supabase; other hooks
// that want to check "am I in guest mode" typically go through
// useSupabaseSession.js instead (it already resolves the fallback), this
// hook is for code that specifically manages the guest session/state
// itself (see pages/GuestMode.jsx).
export function useGuest() {
  const [guestSession, setGuestSession] = useState(() => loadGuestSessionPure());

  const createGuestSession = useCallback(() => {
    const session = createGuestSessionPure();
    setGuestSession(session);
    return session;
  }, []);

  const loadGuestSession = useCallback(() => {
    const session = loadGuestSessionPure();
    setGuestSession(session);
    return session;
  }, []);

  const saveGuestState = useCallback((namespace, state) => saveGuestStatePure(namespace, state), []);
  const loadGuestState = useCallback((namespace, fallback) => loadGuestStatePure(namespace, fallback), []);

  const resetGuestSession = useCallback(() => {
    resetGuestSessionPure();
    setGuestSession(null);
  }, []);

  const isGuest = useCallback(() => Boolean(guestSession), [guestSession]);

  return {
    guestSession,
    createGuestSession,
    loadGuestSession,
    saveGuestState,
    loadGuestState,
    resetGuestSession,
    isGuest,
  };
}
