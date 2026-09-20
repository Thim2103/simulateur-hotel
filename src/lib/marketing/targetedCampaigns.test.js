import {
  CAMPAIGN_TYPES,
  MAX_CAMPAIGN_FACTOR,
  isActiveOn,
  activeCampaigns,
  activeCampaignsOn,
  campaignHistory,
  campaignFactorOn,
  computeCampaignEffects,
  campaignStatus,
  launchTargetedCampaign,
  advanceTargetedCampaigns,
  campaignsEndedOn,
  describeCampaign,
} from "./targetedCampaigns";
import { seasonIdOn } from "../hotelEvents/hotelEventsEngine";

const D = (text) => new Date(`${text}T12:00:00Z`);
const DAY = 86400000;
const plus = (date, days) => new Date(date.getTime() + days * DAY);
const iso = (date) => date.toISOString().slice(0, 10);
function findDate(test, from = "2026-01-01") {
  for (let i = 0; i < 800; i += 1) {
    const date = new Date(D(from).getTime() + i * DAY);
    if (test(date)) return date;
  }
  throw new Error("no date found");
}

const MON = D("2026-09-14"); // a Monday, shoulder season
const SAT = D("2026-09-19");
const NOV = D("2026-11-10");
const rich = (treasury = 50000, extra = {}) => ({ hotelState: { finance: { revenue: [treasury], costs: [0] }, ...extra }, rooms: [] });
const launched = (typeId, date = MON, bundle = rich()) => launchTargetedCampaign(bundle, typeId, { date, day: 0 });

describe("targetedCampaigns / catalogue", () => {
  it("offers digital, corporate and low-season campaigns, each with a cost and a duration", () => {
    expect(Object.keys(CAMPAIGN_TYPES).sort()).toEqual(["corporate", "digital", "low-season"]);
    Object.values(CAMPAIGN_TYPES).forEach((type) => {
      expect(type.cost).toBeGreaterThan(0);
      expect(type.durationDays).toBeGreaterThanOrEqual(7);
      expect(type.durationDays).toBeLessThanOrEqual(14);
      expect(type.name && type.target && type.description).toBeTruthy();
    });
  });
});

describe("targetedCampaigns / launching", () => {
  it("starts on the launch date and runs for its duration", () => {
    const { hotelState } = launched("digital");
    const [campaign] = activeCampaigns(hotelState);
    expect(campaign).toMatchObject({ typeId: "digital", startDate: "2026-09-14", endDate: "2026-09-20", cost: CAMPAIGN_TYPES.digital.cost, extraBookings: 0, extraRevenue: 0 });
    expect(isActiveOn(campaign, MON)).toBe(true);
    expect(isActiveOn(campaign, plus(MON, 6))).toBe(true);
    expect(isActiveOn(campaign, plus(MON, 7))).toBe(false);
    expect(isActiveOn(campaign, plus(MON, -1))).toBe(false);
  });

  it("is paid from the treasury, as a one-off cost of the month", () => {
    const { hotelState } = launched("digital");
    expect(hotelState.finance.costs).toEqual([CAMPAIGN_TYPES.digital.cost]);
  });

  it("does not touch the growth capital", () => {
    const bundle = rich(50000, { expansion: { availableCapital: 999 } });
    expect(launched("digital", MON, bundle).hotelState.expansion.availableCapital).toBe(999);
  });

  it("is refused, changing nothing, when the treasury is short", () => {
    const poor = rich(1000, { expansion: { availableCapital: 900000 } });
    expect(campaignStatus(poor.hotelState, "corporate")).toBe("no-funds");
    expect(launchTargetedCampaign(poor, "corporate", { date: MON })).toBe(poor);
  });

  it("only one campaign of each kind at a time", () => {
    const first = launched("digital");
    expect(campaignStatus(first.hotelState, "digital")).toBe("active");
    expect(launchTargetedCampaign(first, "digital", { date: MON })).toBe(first);
    expect(campaignStatus(first.hotelState, "corporate")).toBe("available");
  });

  it("but different kinds can run together, with their own ids", () => {
    const both = launched("corporate", MON, launched("digital"));
    expect(activeCampaigns(both.hotelState).map((campaign) => campaign.id)).toEqual([1, 2]);
    expect(both.hotelState.finance.costs).toEqual([CAMPAIGN_TYPES.digital.cost + CAMPAIGN_TYPES.corporate.cost]);
  });

  it("rejects an unknown kind", () => {
    const bundle = rich();
    expect(campaignStatus(bundle.hotelState, "tv-spot")).toBe("unknown");
    expect(launchTargetedCampaign(bundle, "tv-spot", { date: MON })).toBe(bundle);
  });

  it("does not mutate its input", () => {
    const bundle = rich();
    const snapshot = JSON.stringify(bundle);
    launched("digital", MON, bundle);
    expect(JSON.stringify(bundle)).toBe(snapshot);
  });
});

describe("targetedCampaigns / what each one does to demand", () => {
  it("digital: +10 % every day", () => {
    expect(campaignFactorOn("digital", MON)).toBe(1.1);
    expect(campaignFactorOn("digital", SAT)).toBe(1.1);
  });

  it("corporate: +20 % on weekdays (Mon-Thu) only", () => {
    [0, 1, 2, 3].forEach((offset) => expect(campaignFactorOn("corporate", plus(MON, offset))).toBe(1.2));
    [4, 5, 6].forEach((offset) => expect(campaignFactorOn("corporate", plus(MON, offset))).toBe(1));
  });

  it("low-season promotion: +15 % in low season, almost nothing outside", () => {
    expect(seasonIdOn(NOV)).toBe("low");
    expect(campaignFactorOn("low-season", NOV)).toBe(1.15);
    expect(campaignFactorOn("low-season", MON)).toBe(1.02);
    expect(campaignFactorOn("low-season", D("2026-07-15"))).toBe(1.02);
  });

  it("an unknown kind does nothing", () => {
    expect(campaignFactorOn("tv-spot", MON)).toBe(1);
  });

  it("no campaign, no effect at all", () => {
    expect(computeCampaignEffects({}, MON)).toEqual({ factor: 1, premiumFirst: false, segmentBias: null, detail: [] });
  });

  it("a running campaign's effect is combined on the days it runs, and only then", () => {
    const { hotelState } = launched("digital");
    expect(computeCampaignEffects(hotelState, MON).factor).toBe(1.1);
    expect(computeCampaignEffects(hotelState, plus(MON, 10)).factor).toBe(1);
  });

  it("digital leans toward leisure guests, corporate toward business guests and the high-end rooms", () => {
    expect(computeCampaignEffects(launched("digital").hotelState, MON)).toMatchObject({ segmentBias: "leisure", premiumFirst: false });
    expect(computeCampaignEffects(launched("corporate").hotelState, MON)).toMatchObject({ segmentBias: "business", premiumFirst: true });
  });

  it("corporate does not favour the high-end rooms on a day it does nothing", () => {
    expect(computeCampaignEffects(launched("corporate").hotelState, SAT).premiumFirst).toBe(false);
  });

  it("campaigns stack, capped", () => {
    const all = launched("low-season", NOV, launched("corporate", NOV, launched("digital", NOV, rich(100000))));
    const effects = computeCampaignEffects(all.hotelState, NOV);
    expect(effects.detail).toHaveLength(3);
    expect(effects.factor).toBeLessThanOrEqual(MAX_CAMPAIGN_FACTOR);
    expect(effects.factor).toBeGreaterThan(1.2);
  });

  it("lists which campaigns run on a date", () => {
    const { hotelState } = launched("digital");
    expect(activeCampaignsOn(hotelState, MON)).toHaveLength(1);
    expect(activeCampaignsOn(hotelState, plus(MON, 30))).toHaveLength(0);
  });
});

describe("targetedCampaigns / measuring the return", () => {
  const report = (newBookings, newBookingsValue) => ({ newBookings, newBookingsValue });

  it("a hotel with no campaign is left untouched", () => {
    const state = { finance: {} };
    expect(advanceTargetedCampaigns(state, { date: MON, demandReport: report(10, 1000) })).toBe(state);
  });

  it("credits the extra bookings the campaign brought: what the day's bookings exceed what they'd have been without it", () => {
    const { hotelState } = launched("digital");
    const next = advanceTargetedCampaigns(hotelState, { date: MON, demandReport: report(11, 1100) });
    const [campaign] = activeCampaigns(next);
    expect(campaign.extraBookings).toBeCloseTo(11 * (1 - 1 / 1.1)); // one booking
    expect(campaign.extraRevenue).toBeCloseTo(campaign.extraBookings * 100); // at the day's average booking of 100 EUR
  });

  it("accumulates day after day", () => {
    let { hotelState } = launched("digital");
    for (let i = 0; i < 3; i += 1) hotelState = advanceTargetedCampaigns(hotelState, { date: plus(MON, i), demandReport: report(11, 1100) });
    expect(activeCampaigns(hotelState)[0].extraBookings).toBeCloseTo(3 * 11 * (1 - 1 / 1.1));
  });

  it("splits the credit between simultaneous campaigns by how much each lifted demand", () => {
    const both = launched("corporate", MON, launched("digital"));
    const next = advanceTargetedCampaigns(both.hotelState, { date: MON, demandReport: report(20, 2000) });
    const [digital, corporate] = activeCampaigns(next);
    expect(corporate.extraBookings).toBeGreaterThan(digital.extraBookings); // +20 % vs +10 %
    expect(digital.extraBookings + corporate.extraBookings).toBeCloseTo(20 * (1 - 1 / computeCampaignEffects(both.hotelState, MON).factor));
  });

  it("a day the campaign does nothing adds nothing", () => {
    const { hotelState } = launched("corporate", SAT);
    const next = advanceTargetedCampaigns(hotelState, { date: SAT, demandReport: report(20, 2000) });
    expect(activeCampaigns(next)[0].extraBookings).toBe(0);
  });

  it("nothing is credited on a day with no bookings", () => {
    const { hotelState } = launched("digital");
    expect(activeCampaigns(advanceTargetedCampaigns(hotelState, { date: MON, demandReport: report(0, 0) }))[0].extraRevenue).toBe(0);
  });

  it("at the end date it moves to the history with its ROI", () => {
    let { hotelState } = launched("digital");
    for (let i = 0; i < 7; i += 1) hotelState = advanceTargetedCampaigns(hotelState, { date: plus(MON, i), demandReport: report(110, 27500) }); // 250 EUR per booking
    expect(activeCampaigns(hotelState)).toHaveLength(0);
    const [entry] = campaignHistory(hotelState);
    expect(entry).toMatchObject({ typeId: "digital", endedOn: "2026-09-20" });
    const extra = Math.round(7 * 110 * (1 - 1 / 1.1));
    expect(entry.extraBookings).toBe(extra);
    expect(entry.roi).toBeCloseTo((entry.extraRevenue - CAMPAIGN_TYPES.digital.cost) / CAMPAIGN_TYPES.digital.cost, 1);
    expect(entry.roi).toBeGreaterThan(0);
    expect(campaignsEndedOn(hotelState, plus(MON, 6))).toHaveLength(1);
    expect(campaignsEndedOn(hotelState, MON)).toHaveLength(0);
  });

  it("a campaign that brought nothing has a negative ROI", () => {
    let { hotelState } = launched("digital");
    for (let i = 0; i < 7; i += 1) hotelState = advanceTargetedCampaigns(hotelState, { date: plus(MON, i), demandReport: report(0, 0) });
    expect(campaignHistory(hotelState)[0].roi).toBe(-1);
  });

  it("keeps a bounded history", () => {
    let bundle = rich(10000000);
    let hotelState = bundle.hotelState;
    for (let round = 0; round < 20; round += 1) {
      const start = plus(MON, round * 10);
      hotelState = launchTargetedCampaign({ hotelState }, "digital", { date: start }).hotelState;
      for (let i = 0; i < 7; i += 1) hotelState = advanceTargetedCampaigns(hotelState, { date: plus(start, i), demandReport: report(10, 1000) });
    }
    expect(campaignHistory(hotelState)).toHaveLength(12);
  });

  it("the same kind can be launched again once it is over", () => {
    let { hotelState } = launched("digital");
    for (let i = 0; i < 7; i += 1) hotelState = advanceTargetedCampaigns(hotelState, { date: plus(MON, i), demandReport: report(10, 1000) });
    expect(campaignStatus(hotelState, "digital")).toBe("available");
  });

  it("describes a campaign for the player: days left, return so far", () => {
    const { hotelState } = launched("digital");
    const next = advanceTargetedCampaigns(hotelState, { date: MON, demandReport: report(22, 2200) });
    const described = describeCampaign(activeCampaigns(next)[0], MON);
    expect(described).toMatchObject({ typeId: "digital", daysLeft: 7, cost: CAMPAIGN_TYPES.digital.cost });
    expect(described.name).toMatch(/digitale/i);
    expect(described.extraBookings).toBe(2);
    expect(describeCampaign(activeCampaigns(next)[0], plus(MON, 6)).daysLeft).toBe(1);
  });

  it("does not mutate its input", () => {
    const { hotelState } = launched("digital");
    const snapshot = JSON.stringify(hotelState);
    advanceTargetedCampaigns(hotelState, { date: MON, demandReport: report(20, 2000) });
    expect(JSON.stringify(hotelState)).toBe(snapshot);
  });
});
