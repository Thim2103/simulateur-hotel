import { createTfeHotelBundle, generateTfeRooms, findHotelSize, applyScheduledEvents, TFE_TIMELINE, HOTEL_SIZE_OPTIONS } from "./tfeScenario";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

describe("generateTfeRooms", () => {
  test("generates exactly roomCount rooms with unique ids/numbers", () => {
    const rooms = generateTfeRooms(30);
    expect(rooms).toHaveLength(30);
    expect(new Set(rooms.map((r) => r.id)).size).toBe(30);
    expect(new Set(rooms.map((r) => r.number)).size).toBe(30);
  });

  test("safe on a tiny room count", () => {
    expect(generateTfeRooms(1)).toHaveLength(1);
  });
});

describe("findHotelSize", () => {
  test("resolves a known size option", () => {
    expect(findHotelSize(30)?.id).toBe("moyen");
  });

  test("returns null for an unknown room count", () => {
    expect(findHotelSize(999)).toBeNull();
  });
});

describe("createTfeHotelBundle", () => {
  test("builds a bundle with the requested room count", () => {
    const bundle = createTfeHotelBundle({ roomCount: 30, positioningTier: "upscale", strategy: "croissance", referenceDate: REFERENCE_DATE });
    expect(bundle.rooms).toHaveLength(30);
    expect(bundle.hotelState.structure.roomCount).toBe(30);
    expect(bundle.hotelState.structure.starRating).toBe(4); // upscale
    expect(bundle.hotelState.marketing.positioningTier).toBe("upscale");
  });

  test("scales finance figures up for a larger hotel", () => {
    const small = createTfeHotelBundle({ roomCount: 10, referenceDate: REFERENCE_DATE });
    const large = createTfeHotelBundle({ roomCount: 60, referenceDate: REFERENCE_DATE });
    const sumRevenue = (bundle) => bundle.hotelState.finance.revenue.reduce((a, b) => a + b, 0);
    expect(sumRevenue(large)).toBeGreaterThan(sumRevenue(small));
  });

  test("the 'durable' strategy raises the starting sustainability score", () => {
    const rentabilite = createTfeHotelBundle({ roomCount: 30, strategy: "rentabilite", referenceDate: REFERENCE_DATE });
    const durable = createTfeHotelBundle({ roomCount: 30, strategy: "durable", referenceDate: REFERENCE_DATE });
    expect(durable.hotelState.esg.sustainabilityScore).toBeGreaterThan(rentabilite.hotelState.esg.sustainabilityScore);
  });

  test("only keeps seeded reservations whose room still exists", () => {
    const bundle = createTfeHotelBundle({ roomCount: 30, referenceDate: REFERENCE_DATE });
    const roomIds = new Set(bundle.rooms.map((room) => room.id));
    bundle.reservations.forEach((reservation) => expect(roomIds.has(reservation.room_id)).toBe(true));
  });

  test("safe on empty/missing config", () => {
    expect(() => createTfeHotelBundle({})).not.toThrow();
  });
});

describe("applyScheduledEvents", () => {
  test("returns the bundle unchanged when nothing is scheduled this month", () => {
    const bundle = createTfeHotelBundle({ roomCount: 30, referenceDate: REFERENCE_DATE });
    const { bundle: nextBundle, triggered } = applyScheduledEvents(1, bundle);
    expect(triggered).toHaveLength(0);
    expect(nextBundle).toEqual(bundle);
  });

  test("applies the scripted event for a scheduled month", () => {
    const bundle = createTfeHotelBundle({ roomCount: 30, referenceDate: REFERENCE_DATE });
    const scheduledMonth = TFE_TIMELINE[0].month;
    const { bundle: nextBundle, triggered } = applyScheduledEvents(scheduledMonth, bundle);
    expect(triggered).toHaveLength(1);
    expect(triggered[0].id).toBe(TFE_TIMELINE[0].id);
    expect(nextBundle).not.toEqual(bundle);
  });

  test("every scripted event applies without throwing", () => {
    TFE_TIMELINE.forEach((entry) => {
      const bundle = createTfeHotelBundle({ roomCount: 30, referenceDate: REFERENCE_DATE });
      expect(() => applyScheduledEvents(entry.month, bundle)).not.toThrow();
    });
  });
});

test("HOTEL_SIZE_OPTIONS covers boutique/moyen/grand", () => {
  expect(HOTEL_SIZE_OPTIONS.map((o) => o.id).sort()).toEqual(["boutique", "grand", "moyen"]);
});
