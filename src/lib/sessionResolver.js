// The single canonical "who is playing" resolution algorithm: try a real
// Supabase session first, and fall back to a local guest session (see
// lib/guest/guestSession.js) when Supabase isn't configured, anonymous
// sign-in isn't available, or ensureAuthSession() unexpectedly throws.
//
// hooks/useSupabaseSession.js is a thin React wrapper around this for
// components; every plain (non-hook) repository module that needs the
// same fallback -- lib/pmsRepository.js, lib/hotelRepository.js,
// lib/restaurantRepository.js, lib/rmRepository.js, lib/staff/* -- calls
// resolveSession() directly instead of duplicating the try/catch dance,
// so there is exactly one place this logic can go stale or diverge.
//
// Never throws, and its guest branch never surfaces a Supabase error:
// see hooks/useSupabaseSession.test.js's "the guest fallback never
// surfaces a Supabase error to the UI" test for the contract this keeps.
import { ensureAuthSession } from "./supabase";
import { ensureGuestSession, loadGuestSession } from "./guest/guestSession";

export async function resolveSession() {
  try {
    const userId = await ensureAuthSession();
    if (userId) return { user: { id: userId }, mode: "supabase" };
  } catch (error) {
    // ensureAuthSession() already catches its own errors and resolves to
    // null; this guards against a genuinely unexpected throw so the guest
    // fallback below still runs instead of leaving the caller stuck.
    console.error("[resolveSession] unexpected error resolving the Supabase session:", error);
  }

  return loadGuestSession() || ensureGuestSession();
}

export async function isGuestSession() {
  const session = await resolveSession();
  return session.mode === "guest";
}
