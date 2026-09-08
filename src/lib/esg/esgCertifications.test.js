import { findCertification, computeCertificationProgress, computeAllCertificationsProgress, nextEligibleCertification, CERTIFICATION_CATALOG } from "./esgCertifications";

test("findCertification resolves a known id and returns null for an unknown one", () => {
  expect(findCertification("green-key")).not.toBeNull();
  expect(findCertification("does-not-exist")).toBeNull();
});

test("computeCertificationProgress reports 0% when nothing is met", () => {
  const greenKey = findCertification("green-key");
  const { progress, eligible } = computeCertificationProgress(greenKey, { score: 0, energy: 9999, water: 9999, waste: 9999, co2: 9999, hotelEsg: { wasteReduction: 0 }, obtainedIds: [] });
  expect(progress).toBe(0);
  expect(eligible).toBe(false);
});

test("computeCertificationProgress reports 100% and eligible when every requirement is met", () => {
  const greenKey = findCertification("green-key");
  const { progress, eligible } = computeCertificationProgress(greenKey, { score: 90, energy: 10, water: 10, waste: 10, co2: 10, hotelEsg: { wasteReduction: 90 }, obtainedIds: [] });
  expect(progress).toBe(100);
  expect(eligible).toBe(true);
});

test("ISO 14001 requires a prior certification", () => {
  const iso = findCertification("iso-14001");
  const withoutPrior = computeCertificationProgress(iso, { score: 90, energy: 10, water: 10, waste: 10, co2: 10, hotelEsg: {}, obtainedIds: [] });
  const withPrior = computeCertificationProgress(iso, { score: 90, energy: 10, water: 10, waste: 10, co2: 10, hotelEsg: {}, obtainedIds: ["green-key"] });
  expect(withoutPrior.eligible).toBe(false);
  expect(withPrior.eligible).toBe(true);
});

test("computeAllCertificationsProgress marks obtained certifications", () => {
  const results = computeAllCertificationsProgress({ score: 0, energy: 9999, water: 9999, waste: 9999, co2: 9999, hotelEsg: {}, obtainedIds: ["green-key"] });
  expect(results.find((c) => c.id === "green-key").obtained).toBe(true);
  expect(results.find((c) => c.id === "earthcheck").obtained).toBe(false);
  expect(results).toHaveLength(CERTIFICATION_CATALOG.length);
});

test("nextEligibleCertification prefers an already-eligible one", () => {
  const next = nextEligibleCertification({ score: 90, energy: 10, water: 10, waste: 10, co2: 10, hotelEsg: { wasteReduction: 90 }, obtainedIds: [] });
  expect(next.eligible).toBe(true);
});

test("nextEligibleCertification falls back to the closest-to-eligible one", () => {
  const next = nextEligibleCertification({ score: 30, energy: 9999, water: 9999, waste: 9999, co2: 9999, hotelEsg: { wasteReduction: 0 }, obtainedIds: [] });
  expect(next).not.toBeNull();
  expect(next.eligible).toBe(false);
});

test("nextEligibleCertification returns null once every certification is obtained", () => {
  const next = nextEligibleCertification({ score: 0, hotelEsg: {}, obtainedIds: CERTIFICATION_CATALOG.map((c) => c.id) });
  expect(next).toBeNull();
});
