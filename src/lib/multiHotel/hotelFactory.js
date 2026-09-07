// Builds a brand-new hotel bundle for the chain: its own hotelState,
// restaurantState, rooms, and reservations, in exactly the shape
// runDailyCycle() already consumes for a single hotel. Reuses the existing
// single-hotel/restaurant defaults rather than redefining them.
import { defaultHotelState } from "../hotel";
import { defaultRestaurantState } from "../restaurant";
import { createRoom } from "../pmsModels";

let localIdCounter = 0;

// A stable-enough id for an in-memory (not-yet-persisted) hotel. Real
// Supabase-backed rows use their own uuid; this is only for hotels that
// exist purely in the chain's client-side state (see chainState.js).
function generateLocalId() {
  localIdCounter += 1;
  return `local-hotel-${Date.now()}-${localIdCounter}`;
}

function generateRooms(roomCount, hotelId) {
  const roomTypes = ["standard", "standard", "standard", "deluxe", "suite"];
  return Array.from({ length: Math.max(0, Number(roomCount) || 0) }, (_, index) =>
    createRoom({
      id: `${hotelId}-room-${index + 1}`,
      number: String(100 + index),
      type: roomTypes[index % roomTypes.length],
      price: 120 + (index % roomTypes.length) * 40,
      status: "libre",
    })
  );
}

// name/city/roomCount: the essentials every hotel in the chain needs.
// persist: whether this hotel is backed by Supabase (see chainState.js's
// docstring on today's one-hotel-per-user limit -- at most one hotel in a
// chain can be `persist: true`).
export function createHotel({ id, name = "Nouvel hôtel", city = "Ville à définir", roomCount = 60, persist = false } = {}) {
  const hotelId = id || generateLocalId();
  return {
    id: hotelId,
    name,
    city,
    persist,
    hotelState: {
      ...defaultHotelState,
      structure: { ...defaultHotelState.structure, name, location: city, roomCount },
    },
    restaurantState: {
      ...defaultRestaurantState,
      structure: { ...defaultRestaurantState.structure, location: city },
    },
    rooms: generateRooms(roomCount, hotelId),
    reservations: [],
  };
}
