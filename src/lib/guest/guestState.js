// Generic, per-namespace game-state persistence for Guest Mode -- one
// slot per concern ("career", "hotel", "restaurant", "pms", ...), each
// independently loadable/saveable so a hook only ever touches its own
// slice, the same separation Supabase's own tables give the authenticated
// path.
import { listGuestKeys, readGuestItem, removeGuestItem, writeGuestItem } from "./guestStorage";

const STATE_PREFIX = "state";

function keyForNamespace(namespace) {
  return `${STATE_PREFIX}:${namespace}`;
}

export function saveGuestState(namespace, state) {
  writeGuestItem(keyForNamespace(namespace), state);
  return state;
}

export function loadGuestState(namespace, fallback = null) {
  return readGuestItem(keyForNamespace(namespace), fallback);
}

export function clearGuestState(namespace) {
  removeGuestItem(keyForNamespace(namespace));
}

// Every namespace currently holding guest state -- used to wipe a guest's
// whole game (see resetGuestSession()) without guessing namespace names.
export function listGuestStateNamespaces() {
  const prefix = `${STATE_PREFIX}:`;
  return listGuestKeys()
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
}
