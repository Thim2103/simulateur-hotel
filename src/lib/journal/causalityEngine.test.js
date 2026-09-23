import { buildCausalLinks } from "./causalityEngine";

const kpis = { occupancyRate: 40, adr: 180, averagePrice: 150, housekeepingQuality: 70 };

describe("causalityEngine / buildCausalLinks", () => {
  it("returns nothing without kpis (no day played yet)", () => {
    expect(buildCausalLinks({ kpis: null })).toEqual([]);
  });

  it("returns nothing when no rule's real trigger condition held today", () => {
    const demand = { drivers: [{ key: "price", factor: 1.1 }, { key: "reputation", factor: 1.05 }] };
    expect(buildCausalLinks({ kpis, hotelState: {}, demand })).toEqual([]);
  });

  it("builds the price -> occupancy chain when the demand model's own price factor hurt demand", () => {
    const demand = { drivers: [{ key: "price", factor: 0.85 }] };
    const links = buildCausalLinks({ kpis, hotelState: {}, demand });
    const link = links.find((entry) => entry.id === "price-occupancy");
    expect(link).toBeDefined();
    expect(link.chain[0]).toMatch(/trop élevé/i);
    expect(link.chain[1]).toContain("40%");
    expect(link.businessConcept).toBe("Élasticité-prix de la demande");
  });

  it("builds the housekeeping -> reviews chain from real staffing coverage", () => {
    const hotelState = { staffing: { housekeepingCoverage: 0.6, cleaningDelayFactor: 1.8 } };
    const links = buildCausalLinks({ kpis, hotelState, demand: null });
    const link = links.find((entry) => entry.id === "housekeeping-reviews");
    expect(link).toBeDefined();
    expect(link.chain[0]).toMatch(/sous-effectif/i);
    expect(link.chain).toHaveLength(4);
  });

  it("also builds the housekeeping chain from a low quality score alone, no staffing shortage needed", () => {
    const links = buildCausalLinks({ kpis: { ...kpis, housekeepingQuality: 45 }, hotelState: {}, demand: null });
    expect(links.find((entry) => entry.id === "housekeeping-reviews")).toBeDefined();
  });

  it("builds the reputation -> demand chain when the demand model's own reputation factor hurt demand", () => {
    const demand = { drivers: [{ key: "reputation", factor: 0.9 }] };
    const links = buildCausalLinks({ kpis, hotelState: {}, demand });
    const link = links.find((entry) => entry.id === "reputation-demand");
    expect(link).toBeDefined();
    expect(link.businessConcept).toBe("Effet de réputation sur la demande");
  });

  it("is deterministic and leaves its inputs alone", () => {
    const demand = { drivers: [{ key: "price", factor: 0.8 }] };
    const hotelState = { staffing: { housekeepingCoverage: 0.5 } };
    const frozen = JSON.stringify({ kpis, hotelState, demand });
    expect(buildCausalLinks({ kpis, hotelState, demand })).toEqual(buildCausalLinks({ kpis, hotelState, demand }));
    expect(JSON.stringify({ kpis, hotelState, demand })).toBe(frozen);
  });
});
