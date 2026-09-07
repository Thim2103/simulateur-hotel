import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey
	? createClient(supabaseUrl, supabaseKey)
	: null;

export function assertSupabaseConfigured() {
	if (!supabase) {
		throw new Error("Supabase n'est pas configure. Definissez REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY.");
	}
	return supabase;
}

// Every table is now scoped by RLS to `user_id = auth.uid()` (see
// supabase/migrations/202609070006_rls_user_scoping.sql). This simulator has
// no login screen, so each browser transparently gets its own anonymous
// Supabase Auth identity instead of a shared/public one: the SDK persists
// the resulting session in localStorage, so the same browser keeps the same
// user_id across reloads. Requires "Anonymous sign-ins" to be enabled on the
// Supabase project (Authentication -> Sign In / Providers) -- until then,
// signInAnonymously() fails and every repository falls back to its existing
// offline/mock data path via safeLoad().
let sessionPromise = null;

async function resolveAuthSession() {
	const { data, error } = await supabase.auth.getSession();
	if (error) throw error;
	if (data?.session?.user?.id) return data.session.user.id;

	const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
	if (signInError) throw signInError;
	return signInData?.user?.id ?? null;
}

// Resolves to the current user's id, or null when Supabase isn't configured
// or anonymous sign-in isn't available yet. Never throws: callers that can
// degrade gracefully (reads, with a cache/mock fallback) should use this.
export function ensureAuthSession() {
	if (!supabase) return Promise.resolve(null);
	if (!sessionPromise) {
		sessionPromise = resolveAuthSession().catch((error) => {
			console.error("[supabase] anonymous authentication failed; data access will be unavailable until this succeeds:", error);
			sessionPromise = null; // allow a later call (e.g. after the toggle is enabled) to retry
			return null;
		});
	}
	return sessionPromise;
}

// Same as ensureAuthSession(), but throws a clear, actionable error instead
// of silently proceeding with an unauthenticated (user_id: null) write --
// which RLS would reject anyway with a much less helpful error.
export async function requireUserId() {
	const userId = await ensureAuthSession();
	if (!userId) {
		throw new Error("Session Supabase non authentifiee : impossible d'identifier l'utilisateur courant (user_id).");
	}
	return userId;
}
