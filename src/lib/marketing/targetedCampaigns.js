// Targeted marketing campaigns: instead of one global budget, the player
// buys specific campaigns, each with a cost, a duration and a target:
//
//   digital     -- social media and online ads: +10 % demand, every day, and
//                  more leisure travellers (individuals, younger guests)
//   corporate   -- company partnerships and trade shows: +20 % demand on
//                  weekdays (Mon-Thu), business guests, deluxe rooms and
//                  suites first
//   low-season  -- a low-season promotion: +15 % demand in low season, so
//                  the November/January slump bites less; nearly useless
//                  (+2 %) outside it
//
// A campaign is paid up front from the TREASURY (what the hotel has earned,
// see finance/investmentFunding.js -- marketing isn't a growth investment),
// runs for a number of days from its launch date, and reports a measurable
// return: each played day, the extra bookings the campaign brought (today's
// bookings minus what they would have been without it) and their value are
// added to its tally, and when it ends it moves to the history with its ROI
// = (extra revenue - cost) / cost.
//
// Campaigns work on the CALENDAR (start and end dates, like lib/hotelEvents/),
// and the demand model reads them through computeCampaignEffects() as a sixth
// demand factor, `marketing`. This is separate from the older generic
// `hotelState.marketing.campaigns` list (lib/marketing/marketingCampaigns.js,
// used by the marketing pages), which it doesn't touch.
//
// State: `hotelState.targetedCampaigns` = { active: [...], history: [...],
// nextId }. Pure, deterministic, inert when nothing was ever launched.
import { safeArray, safeNumber, safeObject } from "../safe";
import { treasuryOf } from "../finance/investmentFunding";
import { debitCurrentMonth } from "../finance/oneOffCosts";
import { seasonIdOn, dayIndexOf, toIsoDate } from "../hotelEvents/hotelEventsEngine";

const DAY_MS = 86400000;
export const MAX_CAMPAIGN_FACTOR = 1.35;
const HISTORY_LIMIT = 12;

// Extra bookings are fractions of a booking day by day: shown to one decimal.
const oneDecimal = (value) => Math.round(value * 10) / 10;

export const CAMPAIGN_TYPES = {
  digital: {
    id: "digital",
    name: "Campagne digitale & réseaux sociaux",
    icon: "📱",
    cost: 2500,
    durationDays: 7,
    target: "Voyageurs individuels, clientèle jeune",
    description: "Publicités en ligne et réseaux sociaux : plus de réservations de voyageurs individuels.",
    demand: 1.1,
    segment: "leisure",
  },
  corporate: {
    id: "corporate",
    name: "Partenariat entreprises & salons",
    icon: "🤝",
    cost: 4000,
    durationDays: 14,
    target: "Clientèle d'affaires, chambres haut de gamme en semaine",
    description: "Accords avec des entreprises et présence sur les salons : plus de demande en semaine, deluxe et suites en priorité.",
    demand: 1.2,
    weekdaysOnly: true,
    premiumFirst: true,
    segment: "business",
  },
  "low-season": {
    id: "low-season",
    name: "Promotion de basse saison",
    icon: "🍂",
    cost: 2000,
    durationDays: 14,
    target: "Novembre, janvier et début février",
    description: "Offres spéciales pour atténuer la baisse de demande de la basse saison. Peu utile en dehors.",
    demand: 1.15,
    offSeasonDemand: 1.02,
  },
};

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).targetedCampaigns);
  return { active: safeArray(source.active), history: safeArray(source.history), nextId: safeNumber(source.nextId, 1) };
}

export function isActiveOn(campaign, date) {
  const day = toIsoDate(date);
  return campaign.startDate <= day && day <= campaign.endDate;
}

export function activeCampaigns(hotelState) {
  return state(hotelState).active;
}

export function activeCampaignsOn(hotelState, date) {
  return state(hotelState).active.filter((campaign) => isActiveOn(campaign, date));
}

export function campaignHistory(hotelState) {
  return state(hotelState).history;
}

// What one campaign does to demand on a date.
export function campaignFactorOn(typeId, date) {
  const type = CAMPAIGN_TYPES[typeId];
  if (!type) return 1;
  if (type.weekdaysOnly) {
    const weekday = new Date(date).getUTCDay();
    return weekday >= 1 && weekday <= 4 ? type.demand : 1;
  }
  if (type.offSeasonDemand) return seasonIdOn(date) === "low" ? type.demand : type.offSeasonDemand;
  return type.demand;
}

// Everything the campaigns running on a date do to it, combined:
// { factor, premiumFirst, segmentBias, detail: [{ campaignId, typeId, name, factor }] }.
export function computeCampaignEffects(hotelState, date) {
  const running = activeCampaignsOn(hotelState, date).map((campaign) => ({ campaign, factor: campaignFactorOn(campaign.typeId, date) }));
  const helping = running.filter((entry) => entry.factor > 1);
  const product = helping.reduce((total, entry) => total * entry.factor, 1);
  return {
    factor: Math.min(MAX_CAMPAIGN_FACTOR, product),
    premiumFirst: helping.some((entry) => CAMPAIGN_TYPES[entry.campaign.typeId].premiumFirst),
    segmentBias: helping.map((entry) => CAMPAIGN_TYPES[entry.campaign.typeId].segment).find(Boolean) || null,
    detail: running.map((entry) => ({ campaignId: entry.campaign.id, typeId: entry.campaign.typeId, name: CAMPAIGN_TYPES[entry.campaign.typeId].name, factor: entry.factor })),
  };
}

// Why a campaign can or can't be launched now: "available", "active" (the
// same kind is already running), "no-funds" or "unknown".
export function campaignStatus(hotelState, typeId) {
  const type = CAMPAIGN_TYPES[typeId];
  if (!type) return "unknown";
  if (state(hotelState).active.some((campaign) => campaign.typeId === typeId)) return "active";
  if (treasuryOf(hotelState) < type.cost) return "no-funds";
  return "available";
}

// Launches a campaign from `date` for its duration: pays the cost from the
// treasury (booked as a one-off cost of the month). A no-op unless
// campaignStatus() is "available".
export function launchTargetedCampaign(hotelBundle, typeId, { date = new Date(), day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  if (campaignStatus(hotelState, typeId) !== "available") return bundle;
  const type = CAMPAIGN_TYPES[typeId];
  const current = state(hotelState);
  const paid = debitCurrentMonth(hotelState, type.cost);
  const startDate = toIsoDate(date);
  const endDate = toIsoDate(new Date(dayIndexOf(date) * DAY_MS + (type.durationDays - 1) * DAY_MS));

  return {
    ...bundle,
    hotelState: {
      ...paid,
      targetedCampaigns: {
        active: [...current.active, { id: current.nextId, typeId, startDate, endDate, startedOnDay: day, cost: type.cost, extraBookings: 0, extraRevenue: 0 }],
        history: current.history,
        nextId: current.nextId + 1,
      },
    },
  };
}

// One played day: credits each running campaign with its share of the extra
// bookings the marketing factor brought (bookings made today minus what they
// would have been without it), valued at today's average booking, and moves
// the campaigns that end today to the history with their ROI. A no-op for a
// hotel with no campaign.
export function advanceTargetedCampaigns(hotelState, { date, demandReport } = {}) {
  const current = state(hotelState);
  if (current.active.length === 0) return hotelState;

  const effects = computeCampaignEffects(hotelState, date);
  const report = safeObject(demandReport);
  const bookings = safeNumber(report.newBookings, 0);
  const value = bookings > 0 ? safeNumber(report.newBookingsValue, 0) / bookings : 0;
  const extra = effects.factor > 1 ? bookings * (1 - 1 / effects.factor) : 0;
  const totalLift = effects.detail.reduce((sum, entry) => sum + Math.max(0, entry.factor - 1), 0);
  const today = toIsoDate(date);

  const active = [];
  const ended = [];
  current.active.forEach((campaign) => {
    const entry = effects.detail.find((item) => item.campaignId === campaign.id);
    const share = entry && totalLift > 0 ? Math.max(0, entry.factor - 1) / totalLift : 0;
    const updated = { ...campaign, extraBookings: campaign.extraBookings + extra * share, extraRevenue: campaign.extraRevenue + extra * share * value };
    if (campaign.endDate <= today) {
      const roi = campaign.cost > 0 ? (updated.extraRevenue - campaign.cost) / campaign.cost : 0;
      ended.push({ ...updated, extraBookings: oneDecimal(updated.extraBookings), extraRevenue: Math.round(updated.extraRevenue), roi: Math.round(roi * 100) / 100, endedOn: today });
    } else {
      active.push(updated);
    }
  });

  return { ...safeObject(hotelState), targetedCampaigns: { active, history: [...current.history, ...ended].slice(-HISTORY_LIMIT), nextId: current.nextId } };
}

// Campaigns that ended on a given date, for the DailyReview.
export function campaignsEndedOn(hotelState, date) {
  const day = toIsoDate(date);
  return state(hotelState).history.filter((campaign) => campaign.endedOn === day);
}

// A running campaign as the player sees it: days left and the return so far.
export function describeCampaign(campaign, date) {
  const type = CAMPAIGN_TYPES[campaign.typeId];
  const daysLeft = Math.max(0, dayIndexOf(campaign.endDate) - dayIndexOf(date) + 1);
  return {
    id: campaign.id,
    typeId: campaign.typeId,
    name: type?.name || campaign.typeId,
    icon: type?.icon || "📣",
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    daysLeft,
    cost: campaign.cost,
    extraBookings: oneDecimal(campaign.extraBookings),
    extraRevenue: Math.round(campaign.extraRevenue),
    roi: campaign.roi ?? (campaign.cost > 0 ? Math.round(((campaign.extraRevenue - campaign.cost) / campaign.cost) * 100) / 100 : 0),
  };
}
