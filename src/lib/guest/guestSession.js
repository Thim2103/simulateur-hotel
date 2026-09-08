// The guest identity itself: a stable, locally-generated user id, so a
// returning guest keeps the same "account" across reloads without ever
// touching Supabase. Mirrors the shape useSupabaseSession.js normalizes a
// real Supabase session into: { user: { id }, mode }.
import { readGuestItem, removeGuestItem, writeGuestItem } from "./guestStorage";

const SESSION_KEY = "session";

function generateGuestId() {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `guest-${random}`;
}

export function createGuestSession() {
  const session = { user: { id: generateGuestId() }, mode: "guest", createdAt: new Date().toISOString() };
  writeGuestItem(SESSION_KEY, session);
  return session;
}

export function loadGuestSession() {
  const session = readGuestItem(SESSION_KEY, null);
  return session && session.user && session.user.id ? session : null;
}

// The guest equivalent of ensureAuthSession() -- never null, creates one
// on first call.
export function ensureGuestSession() {
  return loadGuestSession() || createGuestSession();
}

export function resetGuestSession() {
  removeGuestItem(SESSION_KEY);
}

export function isGuestSession(session) {
  return Boolean(session && session.mode === "guest" && session.user?.id);
}
