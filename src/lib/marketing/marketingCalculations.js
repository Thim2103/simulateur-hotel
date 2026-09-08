// Pure marketing calculations: budget, ROI, conversion, segments,
// positioning tier. Operates on the same hotel bundle every other engine
// in this app shares ({ hotelState, restaurantState, rooms, reservations }
// -- see lib/guest/guestAdapter.js's createGuestHotelBundle()).
//
// Model note: like lib/finance/financeCalculations.js and
// lib/staff/staffCalculations.js, this is a simulator, not a real
// marketing-attribution platform -- reservations carry no real UTM/
// attribution data, so ROI/conversion are derived from the same
// campaign/channel figures hotelState.marketing already tracks (budget,
// reach, demandUplift), not a ground-truth "this booking came from this
// campaign" trace. Every constant below is a deliberate, disclosed
// assumption.
import { safeArray, safeNumber, safeObject } from "../safe";

const LEAD_PER_REACH_POINT = 0.6; // plausible leads generated per reach point per day
const POSITIONING_TIERS = ["budget", "midscale", "upscale", "luxury"];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// 1. Budget: sum of enabled channels + active/paused campaigns (a
// paused campaign still books its budget until removed, same as a real
// media plan).
export function computeBudget({ channels, campaigns } = {}) {
  const channelBudget = Math.round(
    safeArray(channels)
      .filter((channel) => channel.enabled !== false)
      .reduce((total, channel) => total + safeNumber(channel.budget, 0), 0)
  );
  const campaignBudget = Math.round(
    safeArray(campaigns)
      .filter((campaign) => campaign.status !== "draft")
      .reduce((total, campaign) => total + safeNumber(campaign.budget, 0), 0)
  );
  return { channel: channelBudget, campaign: campaignBudget, total: channelBudget + campaignBudget };
}

// 2. ROI: campaigns already carry their own `roi` figure (revenue
// generated per € spent -- see lib/hotel.js's hotelMarketing.campaigns);
// this aggregates it budget-weighted across active campaigns, and
// derives an overall marketing ROI against the full marketing budget.
export function computeROI({ campaigns, totalBudget } = {}) {
  const active = safeArray(campaigns).filter((campaign) => campaign.status === "active");
  const activeBudget = active.reduce((total, campaign) => total + safeNumber(campaign.budget, 0), 0);
  const weightedRoi = activeBudget > 0
    ? active.reduce((total, campaign) => total + safeNumber(campaign.roi, 0) * safeNumber(campaign.budget, 0), 0) / activeBudget
    : 0;

  const generatedRevenue = active.reduce((total, campaign) => total + safeNumber(campaign.roi, 0) * safeNumber(campaign.budget, 0), 0);
  const budget = safeNumber(totalBudget, 0);
  const overallRoi = budget > 0 ? round2(generatedRevenue / budget) : 0;

  return { campaignsAvgRoi: round2(weightedRoi), overallRoi, generatedRevenue: Math.round(generatedRevenue) };
}

// 3. Conversion: estimated leads from channel reach vs. rooms actually
// occupied (see lib/guest/guestPmsSeed.js/PMS's own rooms/reservations).
export function computeConversion({ channels, occupiedRooms = 0 } = {}) {
  const totalReach = safeArray(channels)
    .filter((channel) => channel.enabled !== false)
    .reduce((total, channel) => total + safeNumber(channel.reach, 0), 0);
  const estimatedLeads = Math.max(1, Math.round(totalReach * LEAD_PER_REACH_POINT));
  const conversionRate = round2(clamp((safeNumber(occupiedRooms, 0) / estimatedLeads) * 100, 0, 100));
  return { totalReach, estimatedLeads, conversionRate };
}

// 4. Segments: business/leisure/famille/premium, classified from each
// confirmed reservation's price (relative to the property's own average
// rate) and length of stay -- reservations carry no real CRM segment
// field, so this is a heuristic, not ground truth (see this file's
// header). "synchroniser avec RM (segments)" (section 5) is covered by
// marketingEngine.js also exposing RM's own segmentPerformance()
// alongside this, rather than forcing the two vocabularies to match.
export function computeSegments(reservations = []) {
  const confirmed = safeArray(reservations).filter((reservation) => String(reservation.status || "").toLowerCase().includes("confirm") || String(reservation.status || "").toLowerCase() === "booked");
  const segments = { business: 0, leisure: 0, famille: 0, premium: 0 };
  const revenue = { business: 0, leisure: 0, famille: 0, premium: 0 };

  if (!confirmed.length) return { counts: segments, revenue, mixShare: { business: 0, leisure: 0, famille: 0, premium: 0 } };

  const prices = confirmed.map((reservation) => safeNumber(reservation.price, 0));
  const avgPrice = prices.reduce((total, price) => total + price, 0) / prices.length;

  confirmed.forEach((reservation) => {
    const price = safeNumber(reservation.price, 0);
    const nights = Math.max(1, Math.round((new Date(reservation.departure) - new Date(reservation.arrival)) / 86400000) || 1);
    let segment;
    if (price >= avgPrice * 1.3) segment = "premium";
    else if (nights >= 4) segment = "famille";
    else if (nights <= 2 && price >= avgPrice) segment = "business";
    else segment = "leisure";

    segments[segment] += 1;
    revenue[segment] += price * nights;
  });

  const totalRevenue = Object.values(revenue).reduce((total, value) => total + value, 0);
  const mixShare = Object.fromEntries(
    Object.entries(revenue).map(([segment, value]) => [segment, totalRevenue > 0 ? round2((value / totalRevenue) * 100) : 0])
  );
  Object.keys(revenue).forEach((segment) => { revenue[segment] = Math.round(revenue[segment]); });

  return { counts: segments, revenue, mixShare };
}

// 5. Positioning tier: "budget/midscale/upscale/luxury" (section 1).
// hotelState.marketing.positioningTier is the source of truth once set
// (an explicit player choice via the "repositionner-hotel" action, see
// marketingActions.js); before that, it's derived from the property's
// own star rating so a fresh guest hotel starts with a sensible tier.
export function derivePositioningTier(starRating = 3) {
  const rating = clamp(safeNumber(starRating, 3), 1, 5);
  if (rating <= 2) return "budget";
  if (rating === 3) return "midscale";
  if (rating === 4) return "upscale";
  return "luxury";
}

export function resolvePositioningTier({ marketing, starRating } = {}) {
  const explicit = safeObject(marketing).positioningTier;
  return POSITIONING_TIERS.includes(explicit) ? explicit : derivePositioningTier(starRating);
}

export function nextPositioningTier(currentTier) {
  const index = POSITIONING_TIERS.indexOf(currentTier);
  return POSITIONING_TIERS[(index + 1 + POSITIONING_TIERS.length) % POSITIONING_TIERS.length];
}

export { POSITIONING_TIERS };
