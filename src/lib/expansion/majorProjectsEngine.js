// The hotel's major projects: three big works the player pays for and watches
// go up, day by day, on top of the floors and zone upgrades already there
// (hotelExpansionEngine.js, zoneUpgradesEngine.js).
//
//   - a NEW WING of 10, 15 or 20 upscale rooms (70 % Deluxe, 30 % Suites),
//     7 500 EUR a room (up to 150 000 EUR), 5 days of works. While it goes up
//     the noise costs the guests a point of satisfaction. The rooms join the
//     hotel's own list: the demand, housekeeping, staff and upkeep all see them.
//   - a WELLNESS AREA with a luxury spa (sauna, hammam, covered pool), 120 000
//     EUR, 7 days. When it opens the room rates go up by 15 %, the hotel is
//     6 % more attractive to leisure guests and couples, and a V.I.P. is 6
//     points happier with their stay.
//   - an ECOLOGICAL RENOVATION with a rooftop CSR project (solar panels, high-
//     performance insulation), 50 000 EUR, 3 days. The daily upkeep bill falls by
//     20 %, guests rate the stay 0.15 star higher on average, and the hotel's
//     sustainability score (which its reputation drifts towards) gains 8 points.
//
// One project at a time. Each is paid at the start -- capital first, then the
// treasury (finance/investmentFunding.js), so a bank loan can pay for it -- and
// is built once. Each finished project is half a star: the hotel's rating (its
// `structure.starRating`, plus what it has built) can reach 4 or 5 stars, and
// the bank reads it.
//
// Game Balancing V1.0, Lot 4: on top of being affordable in full, a project
// asks for at least 30% of its cost (MIN_EQUITY_RATE) already sitting in the
// treasury -- the same "own funds first" rule bankingLoanEngine.js's growth
// loans follow, so the capital pot alone can't carry the whole bill.
//
// State: `hotelState.majorProjects` = { built: {id: {day, ...}}, works: {id:
// {startedOnDay, completesOnDay, size}}, log }. Pure and deterministic; a hotel
// that never built a project keeps no state, and every effect below is neutral.
import { safeArray, safeNumber, safeObject } from "../safe.js";
import { canAfford, payInvestment, treasuryOf } from "../finance/investmentFunding";
import { createRoom } from "../pmsModels";

export const WING_SIZES = [10, 15, 20];
// Game Balancing V1.0, Lot 4: 7 500 EUR/room (150 000 EUR for the largest,
// 20-room wing) -- a late-game investment sized for a 4/5-star hotel.
export const WING_COST_PER_ROOM = 7500;
export const WING_SUITE_SHARE = 0.3;
export const WING_NOISE_PENALTY = 1; // points of guest satisfaction while the wing is built

export const SPA_PRICE_UPLIFT = 0.15;
export const SPA_DEMAND_FACTOR = 1.06;
export const SPA_VIP_SATISFACTION = 6;

export const ECO_UPKEEP_FACTOR = 0.8;
export const ECO_RATING_BONUS = 0.15; // stars, on average
export const ECO_SUSTAINABILITY_BONUS = 8;

export const STARS_PER_PROJECT = 0.5;
export const DEFAULT_STARS = 3;

// Game Balancing V1.0, Lot 4: like a growth loan (bankingLoanEngine.js), a
// major project asks for a minimum share of its cost already sitting in the
// treasury -- the capital pot (expansion.availableCapital) can cover the
// rest, but liquid cash alone must clear this bar first.
export const MIN_EQUITY_RATE = 0.3;

const ROOM_SPECS = { deluxe: { defaultPrice: 180, capacity: 3 }, suite: { defaultPrice: 320, capacity: 4 } };

export const PROJECTS = {
  wing: {
    id: "wing",
    icon: "🏨",
    label: "Nouvelle aile de chambres",
    days: 5,
    description: "10, 15 ou 20 chambres de haut standing (Deluxe et Suites) : la capacité d'accueil de l'hôtel s'agrandit. Le chantier fait un peu de bruit.",
    effects: ["+10 à +20 chambres Deluxe et Suites", "Nuisances sonores pendant les travaux : −1 point de satisfaction"],
  },
  spa: {
    id: "spa",
    icon: "🧖",
    label: "Espace bien-être & spa de luxe",
    cost: 120000,
    days: 7,
    description: "Sauna, hammam, piscine couverte : un argument de poids pour les couples et les clients V.I.P.",
    effects: ["Tarifs des chambres +15 %", "Attractivité +6 % (couples, loisirs)", "Clients V.I.P. plus satisfaits (+6 points)"],
  },
  eco: {
    id: "eco",
    icon: "🌿",
    label: "Rénovation écologique & rooftop RSE",
    cost: 50000,
    days: 3,
    description: "Panneaux solaires, isolation haute performance et toit végétalisé : des charges plus légères et des clients sensibles au geste.",
    effects: ["Charges d'entretien quotidiennes −20 %", "Avis clients +0,15★ en moyenne", "Score de durabilité +8"],
  },
};
export const PROJECT_IDS = Object.keys(PROJECTS);

// ---- state ------------------------------------------------------------------------------

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).majorProjects);
  return { built: safeObject(source.built), works: safeObject(source.works), log: safeArray(source.log) };
}

export const isBuilt = (hotelState, id) => Object.prototype.hasOwnProperty.call(state(hotelState).built, id);
export const builtProjects = (hotelState) => PROJECT_IDS.filter((id) => isBuilt(hotelState, id));
export const worksOf = (hotelState, id) => state(hotelState).works[id] || null;

// The works under way (one at a time): { id, startedOnDay, completesOnDay, size } or null.
export function activeProject(hotelState) {
  const { works } = state(hotelState);
  const id = Object.keys(works)[0];
  return id ? { id, ...works[id] } : null;
}

export function projectCost(id, size) {
  if (id === "wing") return WING_COST_PER_ROOM * safeNumber(size, WING_SIZES[0]);
  return safeNumber(PROJECTS[id]?.cost, 0);
}

// Why a project can or cannot be started now: "available", "built",
// "in-progress", "busy" (another one is under way), "invalid-size" (the wing),
// "no-funds", "no-equity" (the treasury alone doesn't clear the 30% minimum)
// or "unknown".
export function projectStatus(hotelState, id, size) {
  if (!PROJECTS[id]) return "unknown";
  if (isBuilt(hotelState, id)) return "built";
  if (worksOf(hotelState, id)) return "in-progress";
  if (activeProject(hotelState)) return "busy";
  if (id === "wing" && !WING_SIZES.includes(safeNumber(size, WING_SIZES[0]))) return "invalid-size";
  const cost = projectCost(id, size);
  if (!canAfford(hotelState, cost)) return "no-funds";
  if (treasuryOf(hotelState) < cost * MIN_EQUITY_RATE) return "no-equity";
  return "available";
}

// ---- the works ----------------------------------------------------------------------------

// Starts a project: pays now, and it is built after its days of works (see
// advanceMajorProjects). A no-op unless projectStatus() is "available".
export function startProject(hotelBundle, id, { size, day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const chosen = id === "wing" ? safeNumber(size, WING_SIZES[0]) : undefined;
  if (projectStatus(hotelState, id, chosen) !== "available") return bundle;
  const project = PROJECTS[id];
  const current = state(hotelState);
  const { hotelState: paid } = payInvestment(hotelState, projectCost(id, chosen));
  return {
    ...bundle,
    hotelState: {
      ...paid,
      majorProjects: { ...current, works: { ...current.works, [id]: { startedOnDay: day, completesOnDay: day + project.days, ...(chosen ? { size: chosen } : {}) } } },
    },
  };
}

// The going rate of a room kind: the average of the hotel's own rooms of that
// type, so the wing is priced like the rest of the house.
function priceFor(rooms, kind) {
  const prices = safeArray(rooms).filter((room) => room.type === kind && safeNumber(room.price, 0) > 0).map((room) => safeNumber(room.price, 0));
  return prices.length === 0 ? ROOM_SPECS[kind].defaultPrice : Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
}

function isMeetingRoomType(room) {
  return room?.type === "seminar" || room?.type === "conference";
}

// The wing's rooms: W01, W02... (70 % Deluxe, then Suites), free and clean.
function buildWing(rooms, size) {
  const suites = Math.round(size * WING_SUITE_SHARE);
  const taken = new Set(rooms.map((room) => String(room.number)));
  let nextId = rooms.reduce((max, room) => Math.max(max, safeNumber(room.id, 0)), 0) + 1;
  const prices = { deluxe: priceFor(rooms, "deluxe"), suite: priceFor(rooms, "suite") };
  return Array.from({ length: size }, (_, index) => {
    const kind = index < size - suites ? "deluxe" : "suite";
    let number;
    let position = index;
    do {
      position += 1;
      number = `W${String(position).padStart(2, "0")}`;
    } while (taken.has(number));
    taken.add(number);
    const room = createRoom({ id: nextId, number, type: kind, price: prices[kind], floor: 0, capacity: ROOM_SPECS[kind].capacity, status: "libre", housekeeping_status: "clean", metadata: { wing: true } });
    nextId += 1;
    return room;
  });
}

// Finishes every project whose day has come: the wing's rooms are added to the
// hotel, the spa raises the room rates, the renovation takes effect. Called once
// per played day by careerEngine.runCareerDay(); takes and returns the hotel
// state and its rooms. A no-op for a hotel with nothing under way.
export function advanceMajorProjects({ hotelState, rooms } = {}, { day = 0 } = {}) {
  const current = state(hotelState);
  const due = Object.keys(current.works).filter((id) => day >= current.works[id].completesOnDay);
  if (due.length === 0) return { hotelState, rooms };

  let nextRooms = safeArray(rooms);
  const built = { ...current.built };
  const works = { ...current.works };
  const log = [...current.log];
  due.forEach((id) => {
    const entry = { day };
    if (id === "wing") {
      const wing = buildWing(nextRooms, works[id].size);
      nextRooms = [...nextRooms, ...wing];
      entry.size = works[id].size;
    }
    if (id === "spa") {
      nextRooms = nextRooms.map((room) => (isMeetingRoomType(room) ? room : { ...room, price: Math.round(safeNumber(room.price, 0) * (1 + SPA_PRICE_UPLIFT)) }));
    }
    built[id] = entry;
    delete works[id];
    log.push({ id: `project-done:${id}:${day}`, projectId: id, day, ...(entry.size ? { size: entry.size } : {}) });
  });
  return { hotelState: { ...safeObject(hotelState), majorProjects: { built, works, log: log.slice(-20) } }, rooms: nextRooms };
}

export function projectsCompletedOn(hotelState, day) {
  return state(hotelState).log.filter((entry) => entry.day === day);
}

// ---- the effects (neutral without the project) -------------------------------------------------

export const ecoUpkeepFactor = (hotelState) => (isBuilt(hotelState, "eco") ? ECO_UPKEEP_FACTOR : 1);
export const ecoRatingBonus = (hotelState) => (isBuilt(hotelState, "eco") ? ECO_RATING_BONUS : 0);
export const ecoSustainabilityBonus = (hotelState) => (isBuilt(hotelState, "eco") ? ECO_SUSTAINABILITY_BONUS : 0);
export const spaDemandFactor = (hotelState) => (isBuilt(hotelState, "spa") ? SPA_DEMAND_FACTOR : 1);
export const spaVipSatisfaction = (hotelState) => (isBuilt(hotelState, "spa") ? SPA_VIP_SATISFACTION : 0);
// Guest nuisance while the wing is being built (0 otherwise).
export const worksSatisfactionPenalty = (hotelState) => (worksOf(hotelState, "wing") ? WING_NOISE_PENALTY : 0);

// ---- the star rating -----------------------------------------------------------------------------------

// The stars the hotel has: its own rating, and half a star for each project it
// has built, at most five.
export function effectiveStars(hotelState) {
  const base = safeNumber(safeObject(safeObject(hotelState).structure).starRating, DEFAULT_STARS);
  return Math.round(Math.min(5, Math.max(1, base + builtProjects(hotelState).length * STARS_PER_PROJECT)) * 10) / 10;
}

export const starRating = (hotelState) => Math.floor(effectiveStars(hotelState));

// ---- how the interface reads it -------------------------------------------------------------------------

// The projects at a glance: { projects, stars, rooms, active }. `day` is the
// career's day (for the progress of the works).
export function describeProjects(hotelState, { day = 0, rooms = [] } = {}) {
  const active = activeProject(hotelState);
  const stars = effectiveStars(hotelState);
  const projects = PROJECT_IDS.map((id) => {
    const project = PROJECTS[id];
    const works = worksOf(hotelState, id);
    const built = isBuilt(hotelState, id);
    const size = id === "wing" ? safeNumber(works?.size, WING_SIZES[0]) : undefined;
    const total = works ? works.completesOnDay - works.startedOnDay : project.days;
    return {
      ...project,
      cost: projectCost(id, size),
      sizes: id === "wing" ? WING_SIZES.map((value) => ({ size: value, cost: projectCost("wing", value), status: projectStatus(hotelState, "wing", value) })) : null,
      status: projectStatus(hotelState, id, size),
      built,
      builtOnDay: built ? state(hotelState).built[id].day : null,
      builtSize: built ? state(hotelState).built[id].size ?? null : null,
      works: works
        ? { startedOnDay: works.startedOnDay, completesOnDay: works.completesOnDay, size: works.size ?? null, daysLeft: Math.max(0, works.completesOnDay - day), progressPercent: Math.max(0, Math.min(100, Math.round(((day - works.startedOnDay) / total) * 100))) }
        : null,
      starsAfter: built ? stars : Math.min(5, Math.round((stars + STARS_PER_PROJECT) * 10) / 10),
    };
  });
  return {
    projects,
    active,
    stars: { current: stars, rating: Math.floor(stars), base: safeNumber(safeObject(safeObject(hotelState).structure).starRating, DEFAULT_STARS), built: builtProjects(hotelState).length },
    rooms: safeArray(rooms).filter((room) => safeObject(room.metadata).wing).length,
  };
}

// The projects in the day just played, as lines of the daily review: what was
// delivered, and what is still going up.
export function projectNewsOn(hotelState, day) {
  const lines = [];
  projectsCompletedOn(hotelState, day).forEach((entry) => {
    const project = PROJECTS[entry.projectId];
    if (!project) return;
    lines.push(
      entry.projectId === "wing"
        ? `Chantier terminé : ${project.label} — ${entry.size} chambres livrées. Recrutez et formez le personnel pour les accueillir.`
        : `Chantier terminé : ${project.label}. ${project.effects[0]}.`
    );
  });
  const active = activeProject(hotelState);
  if (active) {
    const left = Math.max(0, active.completesOnDay - day);
    lines.push(`Chantier en cours : ${PROJECTS[active.id].label}, ${left} jour${left > 1 ? "s" : ""} de travaux restant${left > 1 ? "s" : ""}.`);
  }
  return lines;
}

const MajorProjectsEngine = { startProject, advanceMajorProjects, projectStatus, describeProjects, effectiveStars, projectNewsOn };
export default MajorProjectsEngine;
