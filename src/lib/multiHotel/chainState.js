// Pure helpers for managing a chain's list of hotels and which one is
// currently "active" (the one single-hotel pages like Dashboard/PMS would
// show). Kept framework-free so useChain.js can wrap it in React state
// without duplicating this logic.
//
// Persistence note: the `hotels` table has a unique(user_id) constraint
// (see supabase/migrations/202609070006_rls_user_scoping.sql) -- today's
// schema supports exactly one Supabase-backed hotel per user. A chain can
// still model several hotels client-side (see hotelFactory.js), but only
// the one hotel created with `persist: true` round-trips through Supabase;
// the others exist for the current session only until a future migration
// relaxes that constraint for real multi-hotel accounts.
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function createChainState({ hotels = [] } = {}) {
  const safeHotels = safeArray(hotels);
  return { hotels: safeHotels, activeHotelId: safeHotels[0]?.id ?? null };
}

export function addHotel(chainState, hotel) {
  const hotels = [...safeArray(chainState?.hotels), hotel];
  return { hotels, activeHotelId: chainState?.activeHotelId ?? hotel.id };
}

export function removeHotel(chainState, hotelId) {
  const hotels = safeArray(chainState?.hotels).filter((hotel) => hotel.id !== hotelId);
  const activeHotelId = chainState?.activeHotelId === hotelId ? hotels[0]?.id ?? null : chainState?.activeHotelId ?? null;
  return { hotels, activeHotelId };
}

export function setActiveHotel(chainState, hotelId) {
  if (!safeArray(chainState?.hotels).some((hotel) => hotel.id === hotelId)) return chainState;
  return { ...chainState, activeHotelId: hotelId };
}

export function getActiveHotel(chainState) {
  return safeArray(chainState?.hotels).find((hotel) => hotel.id === chainState?.activeHotelId) || null;
}

// Replaces one hotel's bundle (e.g. after a chain cycle updates its state)
// while leaving the rest of the chain and the active pointer untouched.
export function updateHotel(chainState, hotelId, nextHotel) {
  const hotels = safeArray(chainState?.hotels).map((hotel) => (hotel.id === hotelId ? { ...hotel, ...nextHotel } : hotel));
  return { ...chainState, hotels };
}
