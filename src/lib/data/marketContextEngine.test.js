import { destinationOf, dominantSegmentOf, localEventOf, competitivePressureOf, buildMarketContext } from "./marketContextEngine";
import { destinationById, DEFAULT_DESTINATION_ID } from "./destinations/destinations";

describe("marketContextEngine / destinationOf", () => {
  it("falls back to Ardennes / Campagne when hotelState has no market field yet (an existing save)", () => {
    expect(destinationOf({}).id).toBe(DEFAULT_DESTINATION_ID);
    expect(destinationOf(undefined).id).toBe(DEFAULT_DESTINATION_ID);
  });

  it("reads the career's own chosen destination once set", () => {
    expect(destinationOf({ market: { destinationId: "paris" } }).id).toBe("paris");
  });

  it("falls back for an unknown destination id rather than throwing", () => {
    expect(destinationOf({ market: { destinationId: "atlantis" } }).id).toBe(DEFAULT_DESTINATION_ID);
  });
});

describe("marketContextEngine / dominantSegmentOf", () => {
  const ardennes = destinationById("ardennes");

  it("only ever picks one of the destination's own typical segments", () => {
    for (let day = 0; day < 20; day += 1) {
      expect(ardennes.typicalSegments).toContain(dominantSegmentOf(ardennes, day).id);
    }
  });

  it("is deterministic: the same destination and day always pick the same segment", () => {
    expect(dominantSegmentOf(ardennes, 5)).toEqual(dominantSegmentOf(ardennes, 5));
  });
});

describe("marketContextEngine / localEventOf", () => {
  const ardennes = destinationById("ardennes");

  it("is deterministic and only ever returns one of the known local events, or null", () => {
    let sawOne = false;
    for (let day = 0; day < 60; day += 1) {
      const event = localEventOf(ardennes, day);
      expect(localEventOf(ardennes, day)).toEqual(event);
      if (event) {
        sawOne = true;
        expect(event.boostedSegment).toBeTruthy();
      }
    }
    expect(sawOne).toBe(true); // Ardennes' 0.15 frequency should trigger at least once in 60 days
  });
});

describe("marketContextEngine / competitivePressureOf", () => {
  const ardennes = destinationById("ardennes");

  it("averages the real competitor archetypes for that destination", () => {
    const pressure = competitivePressureOf(ardennes, null);
    expect(pressure.competitorsCount).toBeGreaterThan(0);
    expect(pressure.averagePrice).toBeGreaterThan(0);
    expect(pressure.delta).toBeNull();
  });

  it("computes a real delta once the hotel's own average price is known", () => {
    // Ardennes' own competitors average (65+95)/2 = 80 €; 100 € is clearly above it.
    const pressure = competitivePressureOf(ardennes, 100);
    expect(pressure.averagePrice).toBe(80);
    expect(pressure.delta).toBeGreaterThan(0);
  });

  it("reads null for a destination with no competitor archetype", () => {
    expect(competitivePressureOf({ id: "nowhere" }, 100)).toBeNull();
  });
});

describe("marketContextEngine / buildMarketContext", () => {
  it("combines the real season (hotelEventsEngine's own) with the destination's seasonality into one demand estimate", () => {
    const context = buildMarketContext({ hotelState: {}, date: "2026-07-15", day: 3, hotelAveragePrice: 90 });
    expect(context.destination.id).toBe(DEFAULT_DESTINATION_ID);
    expect(context.season.id).toBe("summer");
    expect(context.demandEstimate).toBeGreaterThan(0);
    expect(context.dominantSegment).toBeTruthy();
    expect(context.competitivePressure.averagePrice).toBeGreaterThan(0);
  });

  it("never mutates hotelState", () => {
    const hotelState = { market: { destinationId: "paris" } };
    const frozen = JSON.stringify(hotelState);
    buildMarketContext({ hotelState, date: "2026-01-10", day: 1 });
    expect(JSON.stringify(hotelState)).toBe(frozen);
  });
});
