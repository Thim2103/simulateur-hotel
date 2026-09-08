import { useCallback, useEffect, useState } from "react";
import { ensureAuthSession } from "../lib/supabase";
import { ensureGuestSession, loadGuestSession } from "../lib/guest/guestSession";

// The single place the app resolves "who is playing": a real Supabase
// session when one is available, or -- if ensureAuthSession() resolves to
// null (Supabase not configured, or anonymous sign-in not enabled/failed)
// -- a local guest session instead (see lib/guest/guestSession.js). Every
// existing Supabase code path (ensureAuthSession()/requireUserId() and
// every repository built on them) is untouched; this hook only adds a
// fallback on top, it never removes the real path.
export function useSupabaseSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const resolveSession = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const userId = await ensureAuthSession();
        if (userId) {
          const supabaseSession = { user: { id: userId }, mode: "supabase" };
          setSession(supabaseSession);
          return supabaseSession;
        }
      } catch (error) {
        // ensureAuthSession() already catches its own errors and resolves
        // to null; this guards against a genuinely unexpected throw so the
        // guest fallback below still runs instead of leaving the app stuck.
        console.error("[useSupabaseSession] unexpected error resolving the Supabase session:", error);
      }

      const guestSession = loadGuestSession() || ensureGuestSession();
      setSession(guestSession);
      return guestSession;
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
