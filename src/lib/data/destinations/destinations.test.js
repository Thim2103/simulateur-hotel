import { DESTINATIONS, DEFAULT_DESTINATION_ID, destinationById } from "./destinations";
import { SEGMENTS } from "../segments/segments";

const SEASON_IDS = ["summer", "holidays", "low", "shoulder"];
const segmentIds = new Set(SEGMENTS.map((segment) => segment.id));

test("every destination carries the properties the spec asks for, with a seasonalityProfile covering every real season", () => {
  DESTINATIONS.forEach((destination) => {
    expect(destination.id).toEqual(expect.any(String));
    expect(destination.name).toEqual(expect.any(String));
    SEASON_IDS.forEach((seasonId) => expect(destination.seasonalityProfile[seasonId]).toBeGreaterThan(0));
    expect(destination.baseDemand).toBeGreaterThan(0);
    expect(destination.eventFrequency).toBeGreaterThanOrEqual(0);
    expect(destination.eventFrequency).toBeLessThanOrEqual(1);
    destination.typicalSegments.forEach((segmentId) => expect(segmentIds.has(segmentId)).toBe(true));
  });
});

test("the default destination is Ardennes / Campagne, Ma Première Auberge's own setting", () => {
  expect(DEFAULT_DESTINATION_ID).toBe("ardennes");
  expect(destinationById(DEFAULT_DESTINATION_ID).name).toBe("Ardennes / Campagne");
});

test("destinationById falls back to the default destination for an unknown id", () => {
  expect(destinationById("nowhere").id).toBe(DEFAULT_DESTINATION_ID);
});
