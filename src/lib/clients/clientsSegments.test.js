import { computeSegments, dominantSegment } from "./clientsSegments";

const BASE_BUNDLE = {
  hotelState: {},
  rooms: [],
  reservations: [],
};

test("returns default split when bundle is empty", () => {
  const seg = computeSegments({ hotelBundle: BASE_BUNDLE });
  expect(seg.business + seg.leisure + seg.famille + seg.premium).toBe(100);
  expect(seg.leisure).toBeGreaterThan(0);
});

test("boosts premium when room mix is mostly suites", () => {
  const bundle = {
    ...BASE_BUNDLE,
    rooms: [
      { type: "Suite" },
      { type: "Suite" },
      { type: "Suite" },
      { type: "Standard" },
    ],
  };
  const seg = computeSegments({ hotelBundle: bundle });
  expect(seg.premium).toBeGreaterThan(10);
  expect(seg.business + seg.leisure + seg.famille + seg.premium).toBe(100);
});

test("boosts business when reservations are corporate-tagged", () => {
  const bundle = {
    ...BASE_BUNDLE,
    reservations: [
      { source: "Corporate", segment: "business" },
      { source: "Corporate", segment: "business" },
      { source: "OTA", segment: "leisure" },
    ],
  };
  const seg = computeSegments({ hotelBundle: bundle });
  expect(seg.business).toBeGreaterThan(25);
  expect(seg.business + seg.leisure + seg.famille + seg.premium).toBe(100);
});

test("boosts premium when marketing tier is upscale", () => {
  const bundle = {
    ...BASE_BUNDLE,
    hotelState: { marketing: { positioningTier: "upscale" } },
  };
  const seg = computeSegments({ hotelBundle: bundle });
  expect(seg.premium).toBeGreaterThan(10);
});

test("dominantSegment returns the segment with the highest share", () => {
  const seg = { business: 10, leisure: 50, famille: 25, premium: 15 };
  expect(dominantSegment(seg)).toBe("leisure");
});

test("handles null bundle gracefully", () => {
  const seg = computeSegments({ hotelBundle: null });
  expect(seg.business + seg.leisure + seg.famille + seg.premium).toBe(100);
});
