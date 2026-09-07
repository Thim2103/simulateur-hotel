import { runStaffEngine } from "./staffEngine";

function staffMember(id, overrides = {}) {
  return { id, name: `Staff ${id}`, role: "Serveur", skill_level: 40, productivity: 50, satisfaction: 70, experience_years: 0, salary: 2000, ...overrides };
}

function hotel(id, name, city, roomCount, staff) {
  return { id, name, city, hotelState: { structure: { roomCount } }, restaurantState: { staff } };
}

test("returns a StaffReport with exactly the documented shape", () => {
  const { report } = runStaffEngine({ hotels: [hotel("a", "A", "Paris", 10, [staffMember(1)])], rng: () => 0.999 });

  expect(report).toEqual({
    staffGlobal: expect.any(Array),
    staffByHotel: expect.any(Object),
    moraleGlobal: expect.any(Number),
    moraleByHotel: expect.any(Object),
    transfers: expect.any(Array),
    training: expect.any(Array),
    promotions: expect.any(Array),
    optimization: expect.objectContaining({ recommendations: expect.any(Array) }),
    regionalEvents: expect.any(Array),
  });
});

test("runs the pipeline in the documented order: a transferred staff member can still be trained and promoted the same cycle", () => {
  const overstaffed = hotel(
    "a",
    "A",
    "Paris",
    10,
    Array.from({ length: 4 }, (_, i) => staffMember(i, { satisfaction: 20 + i, skill_level: 80, productivity: 80, experience_years: 3 }))
  );
  const understaffed = hotel("b", "B", "Lyon", 10, [staffMember(99, { satisfaction: 90 })]);

  const { report } = runStaffEngine({ hotels: [overstaffed, understaffed], rng: () => 0.999 });

  expect(report.transfers.length).toBeGreaterThan(0);
  const movedStaffId = report.transfers[0].staffId;
  // The transferred staff member (skill/productivity/experience already high)
  // should show up promoted at their *new* hotel, proving promotions ran
  // against the post-transfer roster.
  const movedStaff = report.staffByHotel[report.transfers[0].toHotelId].find((person) => person.id === movedStaffId);
  expect(movedStaff.role).toBe("Serveur senior");
});

test("staffGlobal contains every staff member across every hotel exactly once", () => {
  const { report } = runStaffEngine({
    hotels: [hotel("a", "A", "Paris", 10, [staffMember(1)]), hotel("b", "B", "Lyon", 10, [staffMember(2)])],
    rng: () => 0.999,
  });
  expect(report.staffGlobal.map((person) => person.id).sort()).toEqual([1, 2]);
});

test("regional HR events' morale adjustment is reflected in moraleByHotel", () => {
  // rng: () => 0 triggers every regional HR event catalogue-wide; for a lone
  // hotel that's strike (-8) + job fair (+3) + training grant (+5) = net 0,
  // so assert on the mechanism (events fired, morale recomputed) rather
  // than a specific delta that happens to cancel out here.
  const { report } = runStaffEngine({
    hotels: [hotel("a", "A", "Paris", 10, [staffMember(1, { satisfaction: 70 })])],
    rng: () => 0,
  });
  expect(report.regionalEvents.length).toBeGreaterThan(0);
  expect(report.moraleByHotel.a).toBe(70);
});

test("a partial set of regional HR events shifts morale by their combined delta", () => {
  // A constant rng of 0.035 is below the job fair's 0.04 probability but at
  // or above the strike's 0.02 and the training grant's 0.03 -- only the
  // job fair (+3) fires.
  const rng = () => 0.035;
  const { report } = runStaffEngine({ hotels: [hotel("a", "A", "Paris", 10, [staffMember(1, { satisfaction: 70 })])], rng });
  expect(report.moraleByHotel.a).toBe(73);
});

test("returns the updated hotel bundles for the caller to persist into the next cycle", () => {
  const { hotels } = runStaffEngine({ hotels: [hotel("a", "A", "Paris", 10, [staffMember(1, { skill_level: 40 })])], rng: () => 0.999 });
  expect(hotels[0].restaurantState.staff[0].skill_level).toBeGreaterThan(40);
});

test("handles an empty chain without throwing", () => {
  expect(() => runStaffEngine({ hotels: [] })).not.toThrow();
  const { report } = runStaffEngine({ hotels: [] });
  expect(report.staffGlobal).toEqual([]);
});

test("never throws with no arguments at all", () => {
  expect(() => runStaffEngine()).not.toThrow();
});
