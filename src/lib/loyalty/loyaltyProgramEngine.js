// The hotel's loyalty club: a programme the player unlocks and pays for, whose
// members book direct (no OTA commission), come back more often and are less
// sensitive to prices, in exchange for the perks the club grants them.
//
// LAUNCH. The club costs 5 000 EUR to set up (from the treasury). Until then
// nothing here does anything: a hotel that never launched it keeps no state.
//
// MEMBERS. A guest who leaves after a stay rated 4 or 5 stars may join (a stable
// hash of the stay, no rng): 25 % after 4 stars, 45 % after 5, more when the
// perks make the club worth joining. Everybody joins at SILVER; after 3 stays
// they are GOLD, after 6 PLATINUM. A member's stays are counted when they come
// back -- their booking carries `metadata.loyalty`.
//
// WHAT THE CLUB BRINGS (each scaled by the members' satisfaction, 0..1):
//   - returns: demand grows a little with each member (a Silver counts 1, a Gold
//     1.5, a Platinum 2), up to +20 %
//   - direct bookings: that share of the day's new bookings are members booking
//     direct (up to half of them); those who would otherwise have gone through an
//     OTA save the 18 % commission, which the club tallies
//   - price sensitivity: Gold and Platinum members put up with higher prices --
//     the price factor of demand bites less (up to half)
//
// WHAT IT COSTS. The perks the player grants -- breakfast, welcome drink, late
// check-out, priority upgrade -- each cost a fixed sum per night for every
// member in the hotel (the last two only for Gold and Platinum), booked with the
// day's expenses. They also lift the members' satisfaction, from 55 up to 91.
//
// State: `hotelState.loyalty` = { launched, members, nextId, benefits, ledger,
// today, lastOutcome }. Pure and deterministic.
import { safeArray, safeNumber, safeObject } from "../safe.js";
import { treasuryOf } from "../finance/investmentFunding";
import { debitCurrentMonth } from "../finance/oneOffCosts";
import { toIsoDate } from "../hotelEvents/hotelEventsEngine";
import { mixedRandom } from "../clients/guestProfiles";
import { stayRating } from "../clients/guestReviewEngine";
import { OTA_COMMISSION_RATE } from "../dailyCycle/calculateHotelRevenue";
import { builtProjects } from "../expansion/majorProjectsEngine";

export const CLUB_NAME = "Club Hospitality";
export const LAUNCH_COST = 5000;
// Game Balancing V1.0, Lot 3: launching the club is gated on reputation, so it
// reads as a Mid Game palier the player earns rather than a Day-1 option --
// same 0-100 scale/state path (hotelState.progression.player.reputation,
// default 60) lib/banking/bankingLoanEngine.js's creditScore() already reads.
export const LAUNCH_MIN_REPUTATION = 65;
export const MAX_MEMBERS = 1000;
export const BASE_SATISFACTION = 55;
export const JOIN_CHANCE = { 4: 0.25, 5: 0.45 };

export const RETURN_PER_WEIGHT = 0.004;
export const MAX_RETURN_BOOST = 0.2;
export const DIRECT_PER_WEIGHT = 0.01;
export const MAX_DIRECT_SHARE = 0.5;
export const MAX_PRICE_RELIEF = 0.5;

// Game Balancing V1.0, Lot 4: a soft cap on the Late Game snowball. Once the
// spa AND the ecological renovation (majorProjectsEngine.js) are both built,
// their own uplifts (+15% room rates, -20% upkeep) already stack; the club's
// own boost is tempered so a third, compounding bonus doesn't stack on top.
export const LATE_GAME_SOFT_CAP = 0.7;
const SOFT_CAPPED_PROJECT_IDS = ["spa", "eco"];

export const TIER_ORDER = ["silver", "gold", "platinum"];
export const TIERS = {
  silver: { id: "silver", label: "Silver", icon: "🥈", minStays: 1, weight: 1, priceRelief: 0 },
  gold: { id: "gold", label: "Gold", icon: "🥇", minStays: 3, weight: 1.5, priceRelief: 0.01 },
  platinum: { id: "platinum", label: "Platinum", icon: "💎", minStays: 6, weight: 2, priceRelief: 0.02 },
};

export const BENEFITS = {
  breakfast: { id: "breakfast", icon: "🥐", label: "Petit-déjeuner inclus", cost: 12, bonus: 12, minTier: "silver", description: "Le petit-déjeuner est offert à tous les membres." },
  drink: { id: "drink", icon: "🍹", label: "Welcome Drink", cost: 4, bonus: 6, minTier: "silver", description: "Un verre de bienvenue à l'arrivée de chaque membre." },
  lateCheckout: { id: "lateCheckout", icon: "🕓", label: "Départ tardif", cost: 6, bonus: 8, minTier: "gold", description: "Les membres Gold et Platinum quittent leur chambre en fin d'après-midi." },
  upgrade: { id: "upgrade", icon: "⬆️", label: "Surclassement prioritaire", cost: 15, bonus: 10, minTier: "gold", description: "Les membres Gold et Platinum sont surclassés en priorité." },
};
export const BENEFIT_IDS = Object.keys(BENEFITS);

// ---- state ------------------------------------------------------------------------------

const EMPTY_LEDGER = { cost: 0, savings: 0, memberBookings: 0, bookings: 0, memberNights: 0 };

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).loyalty);
  return {
    launched: source.launched === true,
    launchedDay: source.launchedDay ?? null,
    members: safeArray(source.members),
    nextId: Math.max(1, safeNumber(source.nextId, 1)),
    benefits: safeObject(source.benefits),
    ledger: { ...EMPTY_LEDGER, ...safeObject(source.ledger) },
    today: source.today || null,
    lastOutcome: source.lastOutcome || null,
  };
}

function write(hotelState, next) {
  return { ...safeObject(hotelState), loyalty: next };
}

export const isLaunched = (hotelState) => state(hotelState).launched;

// The player/establishment reputation (0-100), the same figure and state path
// bankingLoanEngine.js's creditScore() reads.
export function reputationOf(hotelState) {
  return safeNumber(safeObject(safeObject(safeObject(hotelState).progression).player).reputation, 60);
}
export const members = (hotelState) => state(hotelState).members;
export const lastOutcome = (hotelState) => state(hotelState).lastOutcome;

export function tierOf(stays) {
  const count = safeNumber(stays, 0);
  if (count >= TIERS.platinum.minStays) return "platinum";
  if (count >= TIERS.gold.minStays) return "gold";
  return "silver";
}

const tierIndex = (tier) => TIER_ORDER.indexOf(tier);

export function membersByTier(hotelState) {
  const counts = { silver: 0, gold: 0, platinum: 0 };
  members(hotelState).forEach((member) => {
    counts[member.tier in counts ? member.tier : "silver"] += 1;
  });
  return { ...counts, total: counts.silver + counts.gold + counts.platinum };
}

export function enabledBenefits(hotelState) {
  const chosen = state(hotelState).benefits;
  return BENEFIT_IDS.filter((id) => chosen[id] === true);
}

// The members' satisfaction, 0..100: the base plus what each perk adds.
export function memberSatisfaction(hotelState) {
  if (!isLaunched(hotelState)) return 0;
  return Math.min(100, BASE_SATISFACTION + enabledBenefits(hotelState).reduce((sum, id) => sum + BENEFITS[id].bonus, 0));
}

// ---- what the club does to demand ---------------------------------------------------------

const NEUTRAL = { active: false, engagement: 0, returnBoost: 0, directShare: 0, priceRelief: 0, pool: [] };

export function programEffects(hotelState) {
  const source = state(hotelState);
  if (!source.launched || source.members.length === 0) return NEUTRAL;
  const engagement = memberSatisfaction(hotelState) / 100;
  const weight = source.members.reduce((sum, member) => sum + TIERS[member.tier].weight, 0);
  const relief = source.members.reduce((sum, member) => sum + TIERS[member.tier].priceRelief, 0);
  // The soft cap only bites once the spa and the ecological renovation are
  // both already stacking their own bonuses (see the constant above).
  const softCap = SOFT_CAPPED_PROJECT_IDS.every((id) => builtProjects(hotelState).includes(id)) ? LATE_GAME_SOFT_CAP : 1;
  return {
    active: true,
    engagement,
    softCapped: softCap < 1,
    returnBoost: Math.min(MAX_RETURN_BOOST, weight * RETURN_PER_WEIGHT * engagement) * softCap,
    directShare: Math.min(MAX_DIRECT_SHARE, weight * DIRECT_PER_WEIGHT * engagement) * softCap,
    priceRelief: Math.min(MAX_PRICE_RELIEF, relief * engagement) * softCap,
    pool: source.members.map((member) => ({ id: member.id, name: member.name })),
  };
}

// The demand factor of the members coming back (1 without a club).
export function loyaltyDemandFactor(hotelState) {
  return 1 + programEffects(hotelState).returnBoost;
}

// ---- what it costs ------------------------------------------------------------------------------

function isConfirmed(reservation) {
  return !String(reservation?.status || "").toLowerCase().includes("annul");
}

// The members' stays in the hotel on a date: [{ reservation, member }].
function memberStaysOn(hotelState, reservations, date) {
  const byId = new Map(state(hotelState).members.map((member) => [member.id, member]));
  const today = toIsoDate(date);
  return safeArray(reservations)
    .filter((reservation) => isConfirmed(reservation) && String(reservation.arrival).slice(0, 10) <= today && today < String(reservation.departure).slice(0, 10))
    .map((reservation) => ({ reservation, member: byId.get(safeObject(safeObject(reservation.metadata).loyalty).memberId) }))
    .filter((entry) => entry.member);
}

// What the perks cost for one member of a tier, per night.
export function perkCostFor(hotelState, tier) {
  return enabledBenefits(hotelState)
    .filter((id) => tierIndex(tier) >= tierIndex(BENEFITS[id].minTier))
    .reduce((sum, id) => sum + BENEFITS[id].cost, 0);
}

// What the perks cost on a date: every member in the hotel that night.
export function loyaltyCostOn(hotelState, reservations, date) {
  if (!isLaunched(hotelState)) return 0;
  return memberStaysOn(hotelState, reservations, date).reduce((sum, { member }) => sum + perkCostFor(hotelState, member.tier), 0);
}

// ---- the player's actions --------------------------------------------------------------------------

export function launchOptions(hotelState) {
  if (isLaunched(hotelState)) return { available: false, reason: "Le club est déjà lancé", cost: LAUNCH_COST };
  if (reputationOf(hotelState) < LAUNCH_MIN_REPUTATION) return { available: false, reason: `Réputation insuffisante (${LAUNCH_MIN_REPUTATION} requis, vous avez ${reputationOf(hotelState)})`, cost: LAUNCH_COST };
  if (treasuryOf(hotelState) < LAUNCH_COST) return { available: false, reason: "Trésorerie insuffisante", cost: LAUNCH_COST };
  return { available: true, reason: "", cost: LAUNCH_COST };
}

// Unlocks the club, paying its set-up from the treasury. A no-op once launched
// or when the treasury cannot pay.
export function launchProgram(hotelBundle, { day = 0, date } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  if (!launchOptions(hotelState).available) return bundle;
  const next = {
    launched: true,
    launchedDay: day,
    launchedOn: date ? toIsoDate(date) : null,
    members: [],
    nextId: 1,
    benefits: {},
    ledger: { ...EMPTY_LEDGER },
    today: null,
    lastOutcome: { type: "launch", day, text: `${CLUB_NAME} lancé : les clients satisfaits vont pouvoir en devenir membres.` },
  };
  return { ...bundle, hotelState: write(debitCurrentMonth(hotelState, LAUNCH_COST), next) };
}

// Turns a perk on or off. A no-op before the launch or for an unknown perk.
export function setBenefit(hotelBundle, benefitId, enabled) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  if (!isLaunched(hotelState) || !BENEFITS[benefitId]) return bundle;
  const source = state(hotelState);
  if ((source.benefits[benefitId] === true) === !!enabled) return bundle;
  return { ...bundle, hotelState: write(hotelState, { ...safeObject(hotelState.loyalty), benefits: { ...source.benefits, [benefitId]: !!enabled } }) };
}

// ---- the daily step ------------------------------------------------------------------------------------

const dateOnly = (value) => String(value || "").slice(0, 10);

// Called once a day, after the day is played (see careerEngine.runCareerDay):
// departing guests may join the club, members' stays are counted (and their tier
// climbs), and the day's cost, savings and bookings go into the ledger.
export function advanceLoyalty(hotelState, { date, day = 0, reservations = [], rooms = [] } = {}) {
  if (!isLaunched(hotelState)) return hotelState;
  const source = state(hotelState);
  const iso = toIsoDate(date ?? new Date());
  const roomsById = new Map(safeArray(rooms).map((room) => [Number(room.id), room]));
  const memberIds = new Set(source.members.map((member) => member.id));
  const promoted = [];
  const joined = [];

  let nextMembers = source.members.map((member) => ({ ...member }));
  let nextId = source.nextId;
  const satisfaction = memberSatisfaction(hotelState);

  safeArray(reservations)
    .filter((reservation) => isConfirmed(reservation) && reservation.source !== "mice-meeting" && dateOnly(reservation.departure) === iso)
    .forEach((reservation) => {
      const memberId = safeObject(safeObject(reservation.metadata).loyalty).memberId;
      if (memberId && memberIds.has(memberId)) {
        const member = nextMembers.find((item) => item.id === memberId);
        const before = member.tier;
        member.stays += 1;
        member.lastStayDay = day;
        member.tier = tierOf(member.stays);
        if (member.tier !== before) promoted.push({ name: member.name, tier: member.tier });
        return;
      }
      if (memberId || nextMembers.length >= MAX_MEMBERS) return;
      const rating = stayRating({ reservation, room: roomsById.get(Number(reservation.room_id)), hotelState });
      const base = JOIN_CHANCE[rating] || 0;
      if (base === 0) return;
      if (mixedRandom(`loyalty-join:${reservation.id}`) < base * (0.5 + satisfaction / 100)) {
        const member = { id: `member:${nextId}`, name: reservation.client_name || `Client ${reservation.id}`, stays: 1, joinedDay: day, lastStayDay: day, tier: "silver" };
        nextId += 1;
        nextMembers.push(member);
        joined.push(member.name);
      }
    });

  // The day's books, from the members' stays in the hotel tonight.
  const stays = memberStaysOn(hotelState, reservations, iso);
  const cost = stays.reduce((sum, { member }) => sum + perkCostFor(hotelState, member.tier), 0);
  const savings = stays.filter(({ reservation }) => safeObject(safeObject(reservation.metadata).loyalty).saved).reduce((sum, { reservation }) => sum + safeNumber(reservation.price, 0) * OTA_COMMISSION_RATE, 0);
  const created = safeArray(reservations).filter((reservation) => isConfirmed(reservation) && dateOnly(reservation.created_at) === iso && reservation.source !== "mice-meeting" && reservation.source !== "mice");
  const memberBookings = created.filter((reservation) => safeObject(safeObject(reservation.metadata).loyalty).memberId).length;
  const ledger = {
    cost: source.ledger.cost + cost,
    savings: source.ledger.savings + savings,
    memberBookings: source.ledger.memberBookings + memberBookings,
    bookings: source.ledger.bookings + created.length,
    memberNights: source.ledger.memberNights + stays.length,
  };

  return write(hotelState, {
    ...safeObject(hotelState.loyalty),
    members: nextMembers,
    nextId,
    ledger,
    today: { date: iso, day, joined, promoted, cost: Math.round(cost), savings: Math.round(savings), membersInHouse: stays.length },
  });
}

// The club in the day just played, as lines of the daily review.
export function loyaltyNewsOn(hotelState, date) {
  const today = state(hotelState).today;
  if (!today || today.date !== toIsoDate(date)) return [];
  const lines = [];
  if (today.joined.length > 0) lines.push(`${today.joined.length} nouveau${today.joined.length > 1 ? "x" : ""} membre${today.joined.length > 1 ? "s" : ""} au ${CLUB_NAME} : ${today.joined.slice(0, 3).join(", ")}${today.joined.length > 3 ? "…" : ""}.`);
  today.promoted.forEach((entry) => lines.push(`${entry.name} passe ${TIERS[entry.tier].label} au ${CLUB_NAME}.`));
  if (today.membersInHouse > 0) {
    const detail = [];
    if (today.savings > 0) detail.push(`${today.savings.toLocaleString("fr-FR")} € de commission OTA évitée`);
    if (today.cost > 0) detail.push(`${today.cost.toLocaleString("fr-FR")} € d'avantages offerts`);
    lines.push(`${today.membersInHouse} membre${today.membersInHouse > 1 ? "s" : ""} du club dans l'hôtel${detail.length > 0 ? ` : ${detail.join(", ")}` : ""}.`);
  }
  return lines;
}

// ---- how the interface reads it --------------------------------------------------------------------------

// The club at a glance: { launched, members, satisfaction, perks, tonight, ledger,
// launch }. `reservations` and `date` give what tonight costs.
export function describeProgram(hotelState, { reservations = [], date } = {}) {
  const source = state(hotelState);
  const counts = membersByTier(hotelState);
  const effects = programEffects(hotelState);
  const tonight = date ? memberStaysOn(hotelState, reservations, date) : [];
  return {
    launched: source.launched,
    launch: launchOptions(hotelState),
    name: CLUB_NAME,
    members: counts,
    satisfaction: memberSatisfaction(hotelState),
    perks: BENEFIT_IDS.map((id) => ({ ...BENEFITS[id], enabled: source.benefits[id] === true, appliesTo: TIER_ORDER.filter((tier) => tierIndex(tier) >= tierIndex(BENEFITS[id].minTier)) })),
    costPerNight: { silver: perkCostFor(hotelState, "silver"), gold: perkCostFor(hotelState, "gold"), platinum: perkCostFor(hotelState, "platinum") },
    effects: {
      returnPercent: Math.round(effects.returnBoost * 100),
      directSharePercent: Math.round(effects.directShare * 100),
      priceReliefPercent: Math.round(effects.priceRelief * 100),
    },
    tonight: { members: tonight.length, cost: Math.round(loyaltyCostOn(hotelState, reservations, date ?? new Date(0))) },
    ledger: {
      cost: Math.round(source.ledger.cost),
      savings: Math.round(source.ledger.savings),
      memberBookings: source.ledger.memberBookings,
      bookings: source.ledger.bookings,
      memberNights: source.ledger.memberNights,
      conversionPercent: source.ledger.bookings > 0 ? Math.round((source.ledger.memberBookings / source.ledger.bookings) * 100) : 0,
    },
    lastOutcome: source.lastOutcome,
  };
}

const LoyaltyProgramEngine = { launchProgram, setBenefit, advanceLoyalty, programEffects, loyaltyDemandFactor, loyaltyCostOn, describeProgram, loyaltyNewsOn };
export default LoyaltyProgramEngine;
