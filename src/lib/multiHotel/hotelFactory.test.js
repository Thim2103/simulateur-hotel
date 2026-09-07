import { createHotel } from "./hotelFactory";

test("creates a hotel with the requested name/city/roomCount", () => {
  const hotel = createHotel({ name: "Riviera Palace", city: "Nice", roomCount: 40 });
  expect(hotel.name).toBe("Riviera Palace");
  expect(hotel.city).toBe("Nice");
  expect(hotel.hotelState.structure.name).toBe("Riviera Palace");
  expect(hotel.hotelState.structure.location).toBe("Nice");
  expect(hotel.hotelState.structure.roomCount).toBe(40);
});

test("generates exactly roomCount rooms, all initially free", () => {
  const hotel = createHotel({ roomCount: 5 });
  expect(hotel.rooms).toHaveLength(5);
  expect(hotel.rooms.every((room) => room.status === "libre")).toBe(true);
});

test("generates unique room ids scoped to the hotel", () => {
  const hotel = createHotel({ id: "hotel-a", roomCount: 3 });
  const ids = hotel.rooms.map((room) => room.id);
  expect(new Set(ids).size).toBe(3);
  expect(ids.every((id) => String(id).startsWith("hotel-a-room-"))).toBe(true);
});

test("starts with no reservations", () => {
  expect(createHotel({ roomCount: 10 }).reservations).toEqual([]);
});

test("includes a full restaurantState so runDailyCycle() can run against it unmodified", () => {
  const hotel = createHotel();
  expect(Array.isArray(hotel.restaurantState.staff)).toBe(true);
  expect(Array.isArray(hotel.restaurantState.menu)).toBe(true);
});

test("defaults persist to false (client-side only) unless explicitly requested", () => {
  expect(createHotel().persist).toBe(false);
  expect(createHotel({ persist: true }).persist).toBe(true);
});

test("assigns a stable, unique id when none is provided", () => {
  const first = createHotel();
  const second = createHotel();
  expect(first.id).toBeTruthy();
  expect(first.id).not.toBe(second.id);
});

test("uses the given id when one is provided", () => {
  expect(createHotel({ id: "supabase-hotel-1" }).id).toBe("supabase-hotel-1");
});
