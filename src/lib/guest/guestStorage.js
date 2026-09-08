// Low-level localStorage access for Guest Mode -- every other file in
// lib/guest/ reads and writes through here, never localStorage directly,
// so the namespacing and defensive try/catch live in exactly one place.
const NAMESPACE = "hospitality-lab:guest";

function keyFor(name) {
  return `${NAMESPACE}:${name}`;
}

function hasLocalStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    // Accessing window.localStorage itself can throw (privacy mode in some
    // browsers) -- treat that exactly like "no localStorage available".
    return false;
  }
}

export function readGuestItem(name, fallback = null) {
  if (!hasLocalStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(keyFor(name));
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === undefined ? fallback : parsed;
  } catch (error) {
    console.error(`[guestStorage] failed to read "${name}":`, error);
    return fallback;
  }
}

export function writeGuestItem(name, value) {
  if (!hasLocalStorage()) return false;
  try {
    window.localStorage.setItem(keyFor(name), JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[guestStorage] failed to write "${name}":`, error);
    return false;
  }
}

export function removeGuestItem(name) {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(keyFor(name));
  } catch (error) {
    console.error(`[guestStorage] failed to remove "${name}":`, error);
  }
}

// Lists every key this module owns (namespace-prefixed) -- used by
// resetGuestSession() to wipe a guest's data without touching anything
// else the app (or another site sharing the origin) put in localStorage.
export function listGuestKeys() {
  if (!hasLocalStorage()) return [];
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${NAMESPACE}:`)) keys.push(key.slice(NAMESPACE.length + 1));
    }
    return keys;
  } catch (error) {
    console.error("[guestStorage] failed to list keys:", error);
    return [];
  }
}

export const GUEST_STORAGE_NAMESPACE = NAMESPACE;
