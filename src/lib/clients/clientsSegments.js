// Clients segment computation -- derives the four segment shares
// (business / leisure / famille / premium) from the RM segmentation
// already embedded in the hotel bundle plus the room-type mix and
// current pricing tier. Feeds clientsEngine.js's runClientsCycle().
import { safeArray, safeNumber, safeObject } from "../safe";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Reads the RM segmentation block (hotelState.rm.segmentation or the
// legacy rm.segmentation on hotelState directly) the same way
// lib/rm/segmentation.js already stores it.
function readRmSegmentation(hotelState) {
  const state = safeObject(hotelState);
  const rm = safeObject(state.rm || state.rmState);
  return safeObject(rm.segmentation);
}

// Returns segments as { business, leisure, famille, premium } summing
// to 100. Starts from RM's own segment shares and adjusts for:
//   - room-type mix (suites/connecting → famille boost)
//   - pricing tier (premium tier → premium boost, budget → leisure boost)
//   - reservations profile (corporate origin tags → business boost)
export function computeSegments({ hotelBundle, rmSatisfaction = null, marketingReputation = null } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const rooms = safeArray(bundle.rooms);
  const reservations = safeArray(bundle.reservations);

  const rmSeg = readRmSegmentation(hotelState);

  // Base shares from RM data (fallback to balanced split)
  let business = safeNumber(rmSeg.corporate ?? rmSeg.business, 25);
  let leisure = safeNumber(rmSeg.leisure ?? rmSeg.loisirs, 40);
  let famille = 20;
  let premium = 10;

  // Room type mix: suites and connecting rooms skew famille/premium
  const suiteCount = rooms.filter((r) => /suite|deluxe|connecting/i.test(String(r.type || ""))).length;
  const suiteRatio = rooms.length > 0 ? suiteCount / rooms.length : 0;
  famille = Math.round(famille + suiteRatio * 15);
  premium = Math.round(premium + suiteRatio * 10);

  // Pricing tier from hotelState.marketing or RM ADR
  const marketingTier = safeObject(hotelState.marketing).positioningTier || "midscale";
  if (marketingTier === "upscale" || marketingTier === "luxury") {
    premium = Math.round(premium + 10);
    business = Math.round(business + 5);
  } else if (marketingTier === "budget" || marketingTier === "economy") {
    leisure = Math.round(leisure + 10);
  }

  // Reservations: count corporate-tagged bookings
  const corporateCount = reservations.filter((r) => /corporate|business|b2b/i.test(String(r.source || "") + String(r.segment || ""))).length;
  if (reservations.length > 0) {
    const corporateRatio = corporateCount / reservations.length;
    business = Math.round(business + corporateRatio * 20);
  }

  // Marketing reputation boosts premium/leisure
  const reputation = safeNumber(marketingReputation, 50);
  if (reputation > 75) premium = Math.round(premium + 5);

  // Normalise to 100
  const total = business + leisure + famille + premium;
  if (total > 0 && total !== 100) {
    const factor = 100 / total;
    business = Math.round(clamp(business * factor, 0, 100));
    leisure = Math.round(clamp(leisure * factor, 0, 100));
    famille = Math.round(clamp(famille * factor, 0, 100));
    premium = 100 - business - leisure - famille;
  }

  return {
    business: clamp(business, 0, 100),
    leisure: clamp(leisure, 0, 100),
    famille: clamp(famille, 0, 100),
    premium: clamp(premium, 0, 100),
  };
}

// Returns the dominant segment label.
export function dominantSegment(segments) {
  const seg = safeObject(segments);
  const entries = [
    ["business", safeNumber(seg.business, 0)],
    ["leisure", safeNumber(seg.leisure, 0)],
    ["famille", safeNumber(seg.famille, 0)],
    ["premium", safeNumber(seg.premium, 0)],
  ];
  const top = entries.reduce((best, current) => (current[1] > best[1] ? current : best), entries[0]);
  return top[0];
}
