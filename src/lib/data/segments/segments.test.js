import { SEGMENTS, DEFAULT_SEGMENT_ID, segmentById } from "./segments";

test("every segment carries the properties the spec asks for", () => {
  SEGMENTS.forEach((segment) => {
    expect(segment.id).toEqual(expect.any(String));
    expect(segment.priceSensitivity).toBeGreaterThanOrEqual(0);
    expect(segment.priceSensitivity).toBeLessThanOrEqual(1);
    expect(segment.qualityExpectations).toBeGreaterThanOrEqual(0);
    expect(segment.servicePreferences.length).toBeGreaterThan(0);
    expect(segment.leadTimeDays).toBeGreaterThan(0);
  });
});

test("segmentById finds a real segment", () => {
  expect(segmentById("business").label).toBe("Business");
});

test("segmentById falls back to the default segment for an unknown id", () => {
  expect(segmentById("unknown").id).toBe(DEFAULT_SEGMENT_ID);
});
