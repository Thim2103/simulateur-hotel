import { useCallback, useEffect, useState } from "react";
import { resolveSession as resolveSessionPure } from "../lib/sessionResolver";

// The single place a React component resolves "who is playing" -- a real
// Supabase session when one is available, or -- if ensureAuthSession()
// resolves to null (Supabase not configured, or anonymous sign-in not
// enabled/failed) -- a local guest session instead (see
// lib/guest/guestSession.js). The actual resolution algorithm lives in
// lib/sessionResolver.js (shared with every plain-JS repository that
// needs the same fallback, e.g. lib/pmsRepository.js, lib/hotelRepository
// .js) -- this hook only wraps it in React state.
export function useSupabaseSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const resolveSession = useCallback(async () => {
    setLoading(true);
    try {
      const resolved = await resolveSessionPure();
      setSession(resolved);
      return resolved;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    resolveSession();
  }, [resolveSession]);

  return {
    session,
    loading,
    isGuest: session?.mode === "guest",
    reload: resolveSession,
  };
}
