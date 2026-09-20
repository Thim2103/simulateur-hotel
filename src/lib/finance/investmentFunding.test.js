import { capitalOf, treasuryOf, availableFunds, fundingPlan, canAfford, payInvestment } from "./investmentFunding";

const hotel = ({ capital = 0, revenue = [], costs = [] } = {}) => ({ expansion: { availableCapital: capital }, finance: { revenue, costs } });

describe("investmentFunding / what the hotel has", () => {
  it("capital is the expansion pot; nothing set means none", () => {
    expect(capitalOf(hotel({ capital: 5000 }))).toBe(5000);
    expect(capitalOf({})).toBe(0);
    expect(capitalOf(undefined)).toBe(0);
  });

  it("treasury is what the hotel earned minus what it spent", () => {
    expect(treasuryOf(hotel({ revenue: [10000, 6000], costs: [4000, 2000] }))).toBe(10000);
  });

  it("a hotel in the red has no treasury (never negative)", () => {
    expect(treasuryOf(hotel({ revenue: [1000], costs: [9000] }))).toBe(0);
    expect(treasuryOf({})).toBe(0);
  });

  it("available funds are capital plus treasury", () => {
    expect(availableFunds(hotel({ capital: 3000, revenue: [5000], costs: [1000] }))).toBe(7000);
  });
});

describe("investmentFunding / affordability", () => {
  it("capital covers it entirely when it can", () => {
    expect(fundingPlan(hotel({ capital: 10000, revenue: [9000] }), 4000)).toEqual({ affordable: true, fromCapital: 4000, fromTreasury: 0 });
  });

  it("the treasury covers what the capital can't", () => {
    expect(fundingPlan(hotel({ capital: 1000, revenue: [9000] }), 4000)).toEqual({ affordable: true, fromCapital: 1000, fromTreasury: 3000 });
  });

  it("not affordable when capital and treasury together fall short", () => {
    expect(canAfford(hotel({ capital: 1000, revenue: [1500] }), 4000)).toBe(false);
  });

  it("free things are always affordable", () => {
    expect(canAfford({}, 0)).toBe(true);
  });
});

describe("investmentFunding / paying", () => {
  it("draws only on capital when it is enough, leaving the finance untouched", () => {
    const before = hotel({ capital: 10000, revenue: [9000], costs: [1000] });
    const result = payInvestment(before, 4000);
    expect(result.paid).toBe(true);
    expect(result.hotelState.expansion.availableCapital).toBe(6000);
    expect(result.hotelState.finance).toBe(before.finance);
  });

  it("empties the capital and books the shortfall as a cost of the current month", () => {
    const before = hotel({ capital: 1000, revenue: [9000], costs: [500, 200] });
    const result = payInvestment(before, 4000);
    expect(result.hotelState.expansion.availableCapital).toBe(0);
    expect(result.hotelState.finance.costs).toEqual([500, 3200]);
    expect(treasuryOf(result.hotelState)).toBe(treasuryOf(before) - 3000);
    expect(result).toMatchObject({ fromCapital: 1000, fromTreasury: 3000 });
  });

  it("changes nothing when it isn't affordable", () => {
    const before = hotel({ capital: 100, revenue: [200] });
    const result = payInvestment(before, 4000);
    expect(result.paid).toBe(false);
    expect(result.hotelState).toBe(before);
  });

  it("does not mutate its input", () => {
    const before = hotel({ capital: 1000, revenue: [9000], costs: [500] });
    const snapshot = JSON.stringify(before);
    payInvestment(before, 4000);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
