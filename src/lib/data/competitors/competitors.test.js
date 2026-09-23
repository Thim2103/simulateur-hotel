import { COMPETITORS, competitorsForDestination } from "./competitors";
import { DESTINATIONS } from "../destinations/destinations";

const destinationIds = new Set(DESTINATIONS.map((destination) => destination.id));

test("every competitor carries the properties the spec asks for, in a real destination", () => {
  COMPETITORS.forEach((competitor) => {
    expect(competitor.starRating).toBeGreaterThan(0);
    expect(competitor.basePrice).toBeGreaterThan(0);
    expect(competitor.reputation).toBeGreaterThanOrEqual(0);
    expect(competitor.servicesOffered.length).toBeGreaterThan(0);
    competitor.destinationIds.forEach((id) => expect(destinationIds.has(id)).toBe(true));
  });
});

test("competitorsForDestination finds every archetype competing there", () => {
  const competitors = competitorsForDestination("ardennes");
  expect(competitors.map((competitor) => competitor.id)).toEqual(expect.arrayContaining(["auberge-du-village", "resort-eco"]));
});

test("competitorsForDestination reads empty for a destination with no archetype yet", () => {
  expect(competitorsForDestination("nowhere")).toEqual([]);
});
