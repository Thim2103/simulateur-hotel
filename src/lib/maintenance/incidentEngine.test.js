import {
  reconcileIncidents,
  advanceIncidentRepairs,
  payForRepair,
  assignTechnicians,
  repairTerms,
  REPAIR_COST,
  REPAIR_DELAY_DAYS,
  EMERGENCY_COST_MULTIPLIER,
  TECHNICIAN_EMERGENCY_MULTIPLIER,
  TECHNICIAN_MATERIALS_RATIO,
} from "./incidentEngine";

describe("incidentEngine / reconcileIncidents", () => {
  it("creates a new active incident for a qualifying diagnostic with no existing match", () => {
    const hotelState = {};
    const diagnostics = [{ type: "error", severity: "high", message: "Panne machine à laver" }];
    const next = reconcileIncidents(hotelState, diagnostics, 5);
    expect(next.activeIncidents).toHaveLength(1);
    expect(next.activeIncidents[0]).toMatchObject({
      zone: "laundry",
      message: "Panne machine à laver",
      severity: "critical",
      status: "active",
      repairCost: REPAIR_COST.critical,
      createdOnDay: 5,
      repairEtaDay: null,
    });
  });

  it("maps low/medium severity to minor/moderate", () => {
    const withLow = reconcileIncidents({}, [{ type: "error", severity: "low", message: "A" }], 1);
    const withMedium = reconcileIncidents({}, [{ type: "error", severity: "medium", message: "B" }], 1);
    expect(withLow.activeIncidents[0].severity).toBe("minor");
    expect(withMedium.activeIncidents[0].severity).toBe("moderate");
  });

  it("ignores a non-qualifying diagnostic (not an error, not high severity)", () => {
    const next = reconcileIncidents({}, [{ type: "anomaly", severity: "low", message: "Ignore me" }], 1);
    expect(next.activeIncidents).toEqual([]);
  });

  it("does not create a duplicate incident for a diagnostic already tracked (whatever its current status)", () => {
    const existing = { activeIncidents: [{ id: "incident:laundry:Panne machine à laver", zone: "laundry", status: "repairing" }] };
    const next = reconcileIncidents(existing, [{ type: "error", severity: "high", message: "Panne machine à laver" }], 3);
    expect(next.activeIncidents).toHaveLength(1);
    expect(next.activeIncidents[0].status).toBe("repairing");
  });

  it("never reopens an already-resolved incident even if the same diagnostic message repeats", () => {
    const existing = { activeIncidents: [{ id: "incident:laundry:Panne machine à laver", zone: "laundry", status: "resolved" }] };
    const next = reconcileIncidents(existing, [{ type: "error", severity: "high", message: "Panne machine à laver" }], 3);
    expect(next.activeIncidents).toHaveLength(1);
    expect(next.activeIncidents[0].status).toBe("resolved");
  });

  it("dedupes two diagnostics that happen to render the exact same message within one cycle", () => {
    const diagnostics = [
      { type: "error", severity: "high", message: "Panne" },
      { type: "error", severity: "high", message: "Panne" },
    ];
    const next = reconcileIncidents({}, diagnostics, 1);
    expect(next.activeIncidents).toHaveLength(1);
  });

  it("preserves existing incidents already on the hotel state untouched", () => {
    const existing = { activeIncidents: [{ id: "incident:laundry:Old", zone: "laundry", status: "active", severity: "minor" }] };
    const next = reconcileIncidents(existing, [], 1);
    expect(next.activeIncidents).toEqual(existing.activeIncidents);
  });

  it("handles a missing/undefined hotelState and diagnostics without throwing", () => {
    expect(() => reconcileIncidents(undefined, undefined, 1)).not.toThrow();
    expect(reconcileIncidents(undefined, undefined, 1).activeIncidents).toEqual([]);
  });
});

describe("incidentEngine / advanceIncidentRepairs", () => {
  it("resolves a repairing incident once its ETA day has arrived", () => {
    const hotelState = { activeIncidents: [{ id: "i1", status: "repairing", repairEtaDay: 5 }] };
    const next = advanceIncidentRepairs(hotelState, 5);
    expect(next.activeIncidents[0].status).toBe("resolved");
  });

  it("resolves a repairing incident once past its ETA day", () => {
    const hotelState = { activeIncidents: [{ id: "i1", status: "repairing", repairEtaDay: 5 }] };
    const next = advanceIncidentRepairs(hotelState, 7);
    expect(next.activeIncidents[0].status).toBe("resolved");
  });

  it("leaves a repairing incident untouched before its ETA day", () => {
    const hotelState = { activeIncidents: [{ id: "i1", status: "repairing", repairEtaDay: 5 }] };
    const next = advanceIncidentRepairs(hotelState, 3);
    expect(next.activeIncidents[0].status).toBe("repairing");
  });

  it("leaves active (not yet repairing) and resolved incidents untouched", () => {
    const hotelState = {
      activeIncidents: [
        { id: "i1", status: "active", repairEtaDay: null },
        { id: "i2", status: "resolved", repairEtaDay: 1 },
      ],
    };
    const next = advanceIncidentRepairs(hotelState, 99);
    expect(next.activeIncidents).toEqual(hotelState.activeIncidents);
  });
});

describe("incidentEngine / payForRepair", () => {
  function bundleWithIncident(overrides = {}) {
    return {
      hotelState: {
        finance: { costs: [1000, 2000] },
        activeIncidents: [{ id: "i1", zone: "laundry", severity: "critical", status: "active", repairCost: REPAIR_COST.critical, ...overrides }],
      },
    };
  }

  it("standard repair: debits the exact repair cost from the current month and schedules a repairing status", () => {
    const bundle = bundleWithIncident();
    const next = payForRepair(bundle, "i1", { day: 10 });
    expect(next.hotelState.finance.costs).toEqual([1000, 2000 + REPAIR_COST.critical]);
    const incident = next.hotelState.activeIncidents[0];
    expect(incident.status).toBe("repairing");
    expect(incident.repairEtaDay).toBe(10 + REPAIR_DELAY_DAYS.critical);
  });

  it("emergency repair: debits 1.5x the cost and resolves immediately", () => {
    const bundle = bundleWithIncident();
    const next = payForRepair(bundle, "i1", { emergency: true, day: 10 });
    expect(next.hotelState.finance.costs).toEqual([1000, 2000 + Math.round(REPAIR_COST.critical * EMERGENCY_COST_MULTIPLIER)]);
    const incident = next.hotelState.activeIncidents[0];
    expect(incident.status).toBe("resolved");
    expect(incident.repairEtaDay).toBeUndefined();
  });

  it("only debits/mutates the targeted incident, leaving other incidents untouched", () => {
    const bundle = bundleWithIncident();
    bundle.hotelState.activeIncidents.push({ id: "i2", zone: "kitchen", severity: "minor", status: "active", repairCost: REPAIR_COST.minor });
    const next = payForRepair(bundle, "i1", { day: 1 });
    expect(next.hotelState.activeIncidents.find((i) => i.id === "i2")).toEqual(bundle.hotelState.activeIncidents[1]);
  });

  it("is a no-op when the incident id does not exist", () => {
    const bundle = bundleWithIncident();
    const next = payForRepair(bundle, "does-not-exist", { day: 1 });
    expect(next).toBe(bundle);
  });

  it("is a no-op when the incident is already repairing (no double-charging on a stale click)", () => {
    const bundle = bundleWithIncident({ status: "repairing" });
    const next = payForRepair(bundle, "i1", { day: 1 });
    expect(next).toBe(bundle);
  });

  it("is a no-op when the incident is already resolved", () => {
    const bundle = bundleWithIncident({ status: "resolved" });
    const next = payForRepair(bundle, "i1", { day: 1 });
    expect(next).toBe(bundle);
  });

  it("never mutates the input bundle", () => {
    const bundle = bundleWithIncident();
    const costsBefore = [...bundle.hotelState.finance.costs];
    payForRepair(bundle, "i1", { day: 1 });
    expect(bundle.hotelState.finance.costs).toEqual(costsBefore);
  });

  it("appends a first cost month when finance.costs starts empty", () => {
    const bundle = { hotelState: { finance: {}, activeIncidents: [{ id: "i1", zone: "laundry", severity: "minor", status: "active", repairCost: REPAIR_COST.minor }] } };
    const next = payForRepair(bundle, "i1", { day: 1 });
    expect(next.hotelState.finance.costs).toEqual([REPAIR_COST.minor]);
  });
});

describe("incidentEngine / daysOpen aging", () => {
  it("creates new incidents with daysOpen 0", () => {
    const next = reconcileIncidents({}, [{ type: "error", severity: "high", message: "Panne" }], 3);
    expect(next.activeIncidents[0].daysOpen).toBe(0);
  });

  it("does not age an incident on the day it was created", () => {
    const state = { activeIncidents: [{ id: "i1", status: "active", createdOnDay: 3, daysOpen: 0 }] };
    expect(advanceIncidentRepairs(state, 3).activeIncidents[0].daysOpen).toBe(0);
  });

  it("ages an open incident by one each later day, whether active or repairing", () => {
    const state = {
      activeIncidents: [
        { id: "a", status: "active", createdOnDay: 3, daysOpen: 0 },
        { id: "b", status: "repairing", repairEtaDay: 9, createdOnDay: 3, daysOpen: 1 },
      ],
    };
    const next = advanceIncidentRepairs(state, 4).activeIncidents;
    expect(next.map((i) => i.daysOpen)).toEqual([1, 2]);
  });

  it("stops aging once resolved", () => {
    const state = { activeIncidents: [{ id: "a", status: "resolved", createdOnDay: 1, daysOpen: 2 }] };
    expect(advanceIncidentRepairs(state, 9).activeIncidents[0].daysOpen).toBe(2);
  });
});

describe("incidentEngine / in-house technicians", () => {
  const tech = (overrides = {}) => ({ id: "t1", role: "maintenance", level: "experienced", fatigue: 10, morale: 70, training: null, ...overrides });
  const incident = (overrides = {}) => ({ id: "i1", zone: "laundry", severity: "minor", status: "active", repairCost: 150, ...overrides });
  const hotel = (roster, incidents) => ({ staffRoster: roster, activeIncidents: incidents, finance: { costs: [0, 1000] } });

  it("repairTerms: external terms without a technician, cheaper/faster with one, external again if they are exhausted", () => {
    expect(repairTerms({})).toEqual({ hasTechnician: false, emergencyMultiplier: EMERGENCY_COST_MULTIPLIER, delayReduction: 0 });
    expect(repairTerms(hotel([tech()], []))).toMatchObject({ hasTechnician: true, emergencyMultiplier: TECHNICIAN_EMERGENCY_MULTIPLIER, delayReduction: 1 });
    expect(repairTerms(hotel([tech({ fatigue: 100, morale: 10 })], [])).hasTechnician).toBe(false);
  });

  it("a minor incident is taken on automatically: repairing, handled by the technician, materials only", () => {
    const next = assignTechnicians(hotel([tech()], [incident()]), 5);
    expect(next.activeIncidents[0]).toMatchObject({ status: "repairing", handledBy: "t1", autoRepaired: true, repairEtaDay: 6 });
    expect(next.finance.costs).toEqual([0, 1000 + Math.round(150 * TECHNICIAN_MATERIALS_RATIO)]);
  });

  it("is far cheaper than paying an external contractor", () => {
    const auto = assignTechnicians(hotel([tech()], [incident()]), 5).finance.costs[1] - 1000;
    const external = payForRepair({ hotelState: hotel([], [incident()]) }, "i1", { day: 5 }).hotelState.finance.costs[1] - 1000;
    expect(auto).toBeLessThan(external / 2);
  });

  it("only takes incidents the technician's level can handle", () => {
    const moderate = incident({ severity: "moderate", repairCost: 500 });
    const critical = incident({ id: "i2", severity: "critical", repairCost: 1200 });
    expect(assignTechnicians(hotel([tech({ level: "beginner" })], [moderate]), 1).activeIncidents[0].status).toBe("active");
    expect(assignTechnicians(hotel([tech({ level: "experienced" })], [moderate]), 1).activeIncidents[0].status).toBe("repairing");
    expect(assignTechnicians(hotel([tech({ level: "experienced" })], [critical]), 1).activeIncidents[0].status).toBe("active");
    expect(assignTechnicians(hotel([tech({ level: "expert" })], [critical]), 1).activeIncidents[0].status).toBe("repairing");
  });

  it("one technician handles one incident at a time; extra technicians take the rest, and the most severe goes first", () => {
    const minor = incident();
    const moderate = incident({ id: "i2", severity: "moderate", repairCost: 500 });
    const one = assignTechnicians(hotel([tech()], [minor, moderate]), 1);
    expect(one.activeIncidents.find((i) => i.id === "i2").status).toBe("repairing"); // moderate first
    expect(one.activeIncidents.find((i) => i.id === "i1").status).toBe("active");

    const two = assignTechnicians(hotel([tech(), tech({ id: "t2" })], [minor, moderate]), 1);
    expect(two.activeIncidents.every((i) => i.status === "repairing")).toBe(true);
  });

  it("does not put a busy, exhausted or in-training technician on a new incident", () => {
    const busy = hotel([tech()], [incident({ id: "old", status: "repairing", handledBy: "t1" }), incident()]);
    expect(assignTechnicians(busy, 1).activeIncidents[1].status).toBe("active");
    expect(assignTechnicians(hotel([tech({ fatigue: 100, morale: 10 })], [incident()]), 1).activeIncidents[0].status).toBe("active");
    expect(assignTechnicians(hotel([tech({ training: { untilDay: 9, toLevel: "expert" } })], [incident()]), 1).activeIncidents[0].status).toBe("active");
  });

  it("is a no-op without technicians or without open incidents", () => {
    const noTech = hotel([], [incident()]);
    expect(assignTechnicians(noTech, 1)).toBe(noTech);
    const noIncident = hotel([tech()], [incident({ status: "resolved" })]);
    expect(assignTechnicians(noIncident, 1)).toBe(noIncident);
  });

  it("player-ordered repairs get the technician terms: emergency 1.2x instead of 1.5x, standard a day faster", () => {
    const withTech = { hotelState: hotel([tech()], [incident({ severity: "critical", repairCost: 1200 })]) };
    const without = { hotelState: hotel([], [incident({ severity: "critical", repairCost: 1200 })]) };

    const emergencyWith = payForRepair(withTech, "i1", { emergency: true, day: 4 }).hotelState.finance.costs[1] - 1000;
    const emergencyWithout = payForRepair(without, "i1", { emergency: true, day: 4 }).hotelState.finance.costs[1] - 1000;
    expect(emergencyWith).toBe(Math.round(1200 * TECHNICIAN_EMERGENCY_MULTIPLIER));
    expect(emergencyWithout).toBe(Math.round(1200 * EMERGENCY_COST_MULTIPLIER));

    const etaWith = payForRepair(withTech, "i1", { day: 4 }).hotelState.activeIncidents[0].repairEtaDay;
    const etaWithout = payForRepair(without, "i1", { day: 4 }).hotelState.activeIncidents[0].repairEtaDay;
    expect(etaWith).toBe(4 + REPAIR_DELAY_DAYS.critical - 1);
    expect(etaWithout).toBe(4 + REPAIR_DELAY_DAYS.critical);
  });
});
