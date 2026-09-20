import { reconcileIncidents, advanceIncidentRepairs, payForRepair, REPAIR_COST, REPAIR_DELAY_DAYS, EMERGENCY_COST_MULTIPLIER } from "./incidentEngine";

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
