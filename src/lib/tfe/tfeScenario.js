// Hotel creation ("positionnement, taille, segments, stratégie", section
// 1) and the scripted 36-month timeline ("événements TFE (crises,
// opportunités, tendances)", section 1). Builds on the same guest bundle
// every other module already shares (lib/guest/guestAdapter.js's
// createGuestHotelBundle()) rather than inventing a second hotel model,
// then scales/re-labels it according to the player's own choices.
import { createRoom } from "../pmsModels";
import { seedReservations } from "../guest/guestPmsSeed";
import { createGuestHotelBundle } from "../guest";
import { safeArray, safeNumber, safeObject } from "../safe";
import { POSITIONING_TIERS } from "../marketing/marketingCalculations";

const BASE_ROOM_COUNT = 6; // lib/guest/guestPmsSeed.js's own seedRooms() count -- the scale everything else is proportioned against

export const HOTEL_SIZE_OPTIONS = [
  { id: "boutique", label: "Boutique (10 chambres)", roomCount: 10 },
  { id: "moyen", label: "Établissement moyen (30 chambres)", roomCount: 30 },
  { id: "grand", label: "Grand établissement (60 chambres)", roomCount: 60 },
];

export const SEGMENT_OPTIONS = ["business", "leisure", "famille", "premium"];

export const STRATEGY_OPTIONS = [
  { id: "croissance", label: "Croissance", description: "Priorité à l'acquisition et à l'occupation : budget marketing renforcé, charges fixes plus élevées." },
  { id: "rentabilite", label: "Rentabilité", description: "Priorité à la marge : charges fixes maîtrisées, budget marketing resserré." },
  { id: "durable", label: "Durable", description: "Priorité à la démarche ESG : score de durabilité et réduction des déchets renforcés dès le départ." },
];

const STRATEGY_PRESETS = {
  croissance: { financeFactor: 1.08, marketingFactor: 1.3, esgBonus: 0 },
  rentabilite: { financeFactor: 0.92, marketingFactor: 0.85, esgBonus: 0 },
  durable: { financeFactor: 1.0, marketingFactor: 1.0, esgBonus: 12 },
};

const TIER_TO_STAR_RATING = { budget: 2, midscale: 3, upscale: 4, luxury: 5 };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// A repeating standard/deluxe/suite mix, scaled to whatever roomCount the
// player picked -- see lib/guest/guestPmsSeed.js's own fixed 6-room
// template, which this generalizes.
export function generateTfeRooms(roomCount) {
  const template = [
    { type: "standard", price: 120, capacity: 2 },
    { type: "standard", price: 120, capacity: 2 },
    { type: "deluxe", price: 180, capacity: 2 },
    { type: "deluxe", price: 180, capacity: 3 },
    { type: "suite", price: 320, capacity: 4 },
  ];
  return Array.from({ length: Math.max(1, safeNumber(roomCount, BASE_ROOM_COUNT)) }, (_, index) => {
    const preset = template[index % template.length];
    return createRoom({ id: index + 1, number: String(101 + index), type: preset.type, price: preset.price, floor: Math.floor(index / 10) + 1, capacity: preset.capacity });
  });
}

function scaleFinanceArrays(finance, factor) {
  const source = safeObject(finance);
  return {
    ...source,
    revenue: safeArray(source.revenue).map((value) => Math.round(safeNumber(value, 0) * factor)),
    costs: safeArray(source.costs).map((value) => Math.round(safeNumber(value, 0) * factor)),
    payroll: Math.round(safeNumber(source.payroll, 0) * factor),
    fixedCosts: Math.round(safeNumber(source.fixedCosts, 0) * factor),
  };
}

// The TFE request's "création d'un hôtel (positionnement, taille,
// segments, stratégie)" (section 1): a fresh hotel bundle, scaled and
// flavored by the player's own choices, but still the exact
// { hotelState, restaurantState, rooms, reservations } shape every
// engine in this app already reads.
export function createTfeHotelBundle({ roomCount = 30, positioningTier = "midscale", strategy = "rentabilite", segments = [], referenceDate = new Date() } = {}) {
  const base = createGuestHotelBundle({ referenceDate });
  const factor = clamp(safeNumber(roomCount, BASE_ROOM_COUNT) / BASE_ROOM_COUNT, 0.5, 15);
  const preset = STRATEGY_PRESETS[strategy] || STRATEGY_PRESETS.rentabilite;
  const rooms = generateTfeRooms(roomCount);
  const roomIds = new Set(rooms.map((room) => room.id));
  const reservations = seedReservations(referenceDate).filter((reservation) => roomIds.has(reservation.room_id));

  const hotelState = {
    ...base.hotelState,
    structure: { ...base.hotelState.structure, roomCount, starRating: TIER_TO_STAR_RATING[positioningTier] || 3 },
    finance: scaleFinanceArrays(base.hotelState.finance, factor * preset.financeFactor),
    marketing: {
      ...base.hotelState.marketing,
      positioningTier,
      targetSegments: safeArray(segments),
      budget: Math.round(safeNumber(base.hotelState.marketing.budget, 0) * factor * preset.marketingFactor),
    },
    esg: { ...base.hotelState.esg, sustainabilityScore: Math.round(clamp(safeNumber(base.hotelState.esg.sustainabilityScore, 50) + preset.esgBonus, 0, 100)) },
  };

  const restaurantState = { ...base.restaurantState, finance: scaleFinanceArrays(base.restaurantState.finance, factor) };

  return { hotelState, restaurantState, rooms, reservations };
}

export function findHotelSize(roomCount) {
  return HOTEL_SIZE_OPTIONS.find((option) => option.roomCount === roomCount) || null;
}

// The scripted 36-month timeline: a handful of narrative beats (crises,
// opportunités, tendances) applied automatically once the TFE reaches
// that month -- distinct from the generic per-day event engine
// (lib/events/), which already runs inside every runDailyCycle() call
// regardless of month. Each `apply` is a pure (hotelBundle) =>
// nextHotelBundle transform, the same contract every module's own
// *Actions.js already uses.
export const TFE_TIMELINE = [
  {
    month: 6,
    type: "crisis",
    id: "economic-slowdown",
    title: "Ralentissement économique",
    description: "Une conjoncture difficile freine la demande : le budget marketing et les charges fixes sont revus à la baisse.",
    apply: (bundle) => ({
      ...bundle,
      hotelState: {
        ...bundle.hotelState,
        marketing: { ...bundle.hotelState.marketing, budget: Math.round(safeNumber(bundle.hotelState.marketing?.budget, 0) * 0.85) },
        finance: { ...bundle.hotelState.finance, fixedCosts: Math.round(safeNumber(bundle.hotelState.finance?.fixedCosts, 0) * 0.92) },
      },
    }),
  },
  {
    month: 12,
    type: "opportunity",
    id: "local-event",
    title: "Grand événement local",
    description: "Un festival régional attire une clientèle inhabituelle : les prix des réservations actives sont relevés.",
    apply: (bundle) => ({
      ...bundle,
      reservations: safeArray(bundle.reservations).map((reservation) => ({ ...reservation, price: Math.round(safeNumber(reservation.price, 0) * 1.08) })),
    }),
  },
  {
    month: 18,
    type: "trend",
    id: "sustainable-travel",
    title: "Tendance du voyage durable",
    description: "La clientèle valorise de plus en plus les établissements engagés : la réputation durable progresse naturellement.",
    apply: (bundle) => ({
      ...bundle,
      hotelState: { ...bundle.hotelState, esg: { ...bundle.hotelState.esg, sustainabilityScore: Math.round(clamp(safeNumber(bundle.hotelState.esg?.sustainabilityScore, 50) + 5, 0, 100)) } },
    }),
  },
  {
    month: 24,
    type: "crisis",
    id: "key-staff-departure",
    title: "Départ de collaborateurs clés",
    description: "Plusieurs départs simultanés fragilisent l'équipe : le bien-être et la productivité en pâtissent temporairement.",
    apply: (bundle) => ({
      ...bundle,
      restaurantState: {
        ...bundle.restaurantState,
        staff: safeArray(bundle.restaurantState?.staff).map((person) => ({ ...person, satisfaction: Math.round(clamp(safeNumber(person.satisfaction, 70) - 10, 0, 100)) })),
      },
    }),
  },
  {
    month: 30,
    type: "opportunity",
    id: "renovation-window",
    title: "Fenêtre de rénovation",
    description: "Une période plus calme permet d'investir sans trop perturber l'exploitation : les coûts énergie/eau baissent durablement.",
    apply: (bundle) => ({
      ...bundle,
      hotelState: {
        ...bundle.hotelState,
        esg: { ...bundle.hotelState.esg, energyConsumption: Math.round(clamp(safeNumber(bundle.hotelState.esg?.energyConsumption, 60) - 10, 0, 100)) },
      },
    }),
  },
];

// Applies every scheduled timeline entry for this exact month (there is
// at most one today, but the shape supports more) -- called once per
// playTfeMonth() before the underlying day is actually played, so its
// effects are visible in that same month's report.
export function applyScheduledEvents(month, hotelBundle) {
  const entries = TFE_TIMELINE.filter((entry) => entry.month === month);
  const nextBundle = entries.reduce((bundle, entry) => entry.apply(bundle), safeObject(hotelBundle));
  return { bundle: nextBundle, triggered: entries };
}

export { POSITIONING_TIERS };
