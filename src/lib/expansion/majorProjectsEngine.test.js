import {
  WING_SIZES,
  WING_COST_PER_ROOM,
  WING_NOISE_PENALTY,
  SPA_PRICE_UPLIFT,
  SPA_DEMAND_FACTOR,
  SPA_VIP_SATISFACTION,
  ECO_UPKEEP_FACTOR,
  ECO_RATING_BONUS,
  ECO_SUSTAINABILITY_BONUS,
  STARS_PER_PROJECT,
  PROJECTS,
  PROJECT_IDS,
  isBuilt,
  builtProjects,
  worksOf,
  activeProject,
  projectCost,
  projectStatus,
  startProject,
  advanceMajorProjects,
  projectsCompletedOn,
  ecoUpkeepFactor,
  ecoRatingBonus,
  ecoSustainabilityBonus,
  spaDemandFactor,
  spaVipSatisfaction,
  worksSatisfactionPenalty,
  effectiveStars,
  starRating,
  describeProjects,
  projectNewsOn,
} from "./majorProjectsEngine";
import { treasuryOf } from "../finance/investmentFunding";

const hotel = (extra = {}) => ({ finance: { revenue: [500000], costs: [0] }, structure: { starRating: 3 }, expansion: { availableCapital: 0 }, ...extra });
const bundle = (extra = {}, rooms = baseRooms()) => ({ hotelState: hotel(extra), rooms, reservations: [] });
const baseRooms = () => [
  { id: 1, number: "101", type: "standard", price: 100, capacity: 2, status: "libre" },
  { id: 2, number: "201", type: "deluxe", price: 200, capacity: 3, status: "libre" },
  { id: 3, number: "202", type: "deluxe", price: 220, capacity: 3, status: "libre" },
  { id: 4, number: "S01", type: "seminar", price: 450, capacity: 20, status: "libre" },
];
const start = (id, options = {}, extra = {}) => startProject(bundle(extra), id, { day: 3, ...options }).hotelState;
// Plays the works to their end.
const finish = (hotelState, rooms = baseRooms(), day = 40) => advanceMajorProjects({ hotelState, rooms }, { day });

describe("majorProjectsEngine / inert without a project", () => {
  it("does nothing, and keeps no state", () => {
    const state = hotel();
    const rooms = baseRooms();
    const result = advanceMajorProjects({ hotelState: state, rooms }, { day: 10 });
    expect(result.hotelState).toBe(state);
    expect(result.rooms).toBe(rooms);
    expect(builtProjects(state)).toEqual([]);
    expect(activeProject(state)).toBeNull();
    expect(projectsCompletedOn(state, 10)).toEqual([]);
    expect(projectNewsOn(state, 10)).toEqual([]);
  });

  it("every effect is neutral", () => {
    const state = hotel();
    expect(ecoUpkeepFactor(state)).toBe(1);
    expect(ecoRatingBonus(state)).toBe(0);
    expect(ecoSustainabilityBonus(state)).toBe(0);
    expect(spaDemandFactor(state)).toBe(1);
    expect(spaVipSatisfaction(state)).toBe(0);
    expect(worksSatisfactionPenalty(state)).toBe(0);
    expect(effectiveStars(state)).toBe(3);
  });

  it("copes with junk", () => {
    expect(advanceMajorProjects(undefined, { day: 1 })).toEqual({ hotelState: undefined, rooms: undefined });
    expect(effectiveStars(undefined)).toBe(3);
    expect(describeProjects(undefined).projects).toHaveLength(3);
  });
});

describe("majorProjectsEngine / the three projects", () => {
  it("a new wing: 10, 15 or 20 rooms at 6 000 EUR each, five days of works", () => {
    expect(PROJECTS.wing.days).toBe(5);
    expect(WING_SIZES).toEqual([10, 15, 20]);
    expect(WING_COST_PER_ROOM).toBe(6000);
    expect(WING_SIZES.map((size) => projectCost("wing", size))).toEqual([60000, 90000, 120000]);
  });

  it("a spa: 90 000 EUR, seven days", () => {
    expect(PROJECTS.spa).toMatchObject({ cost: 90000, days: 7 });
    expect(projectCost("spa")).toBe(90000);
  });

  it("an ecological renovation: 40 000 EUR, three days", () => {
    expect(PROJECTS.eco).toMatchObject({ cost: 40000, days: 3 });
  });

  it("costs run from 30 000 to 120 000 EUR and works from 3 to 7 days", () => {
    const costs = [...WING_SIZES.map((size) => projectCost("wing", size)), projectCost("spa"), projectCost("eco")];
    costs.forEach((cost) => {
      expect(cost).toBeGreaterThanOrEqual(30000);
      expect(cost).toBeLessThanOrEqual(120000);
    });
    PROJECT_IDS.forEach((id) => {
      expect(PROJECTS[id].days).toBeGreaterThanOrEqual(3);
      expect(PROJECTS[id].days).toBeLessThanOrEqual(7);
    });
  });

  it("each says what it brings", () => {
    PROJECT_IDS.forEach((id) => {
      expect(PROJECTS[id].label).toBeTruthy();
      expect(PROJECTS[id].description.length).toBeGreaterThan(20);
      expect(PROJECTS[id].effects.length).toBeGreaterThan(1);
    });
    expect(PROJECTS.spa.effects.join(" ")).toContain("+15 %");
    expect(PROJECTS.eco.effects.join(" ")).toContain("−20 %");
  });
});

describe("majorProjectsEngine / when a project can be started", () => {
  it("is available to a hotel that can pay", () => {
    PROJECT_IDS.forEach((id) => expect(projectStatus(hotel(), id, 10)).toBe("available"));
  });

  it("is unknown for another name", () => {
    expect(projectStatus(hotel(), "casino")).toBe("unknown");
  });

  it("needs the money: capital and treasury together", () => {
    expect(projectStatus(hotel({ finance: { revenue: [39999], costs: [0] } }), "eco")).toBe("no-funds");
    expect(projectStatus(hotel({ finance: { revenue: [10000], costs: [0] }, expansion: { availableCapital: 30000 } }), "eco")).toBe("available");
  });

  it("the wing has three sizes only", () => {
    expect(projectStatus(hotel(), "wing", 12)).toBe("invalid-size");
    expect(projectStatus(hotel(), "wing", 15)).toBe("available");
    expect(projectStatus(hotel(), "wing")).toBe("available");
  });

  it("a bigger wing costs more, so the treasury may not stretch to it", () => {
    const state = hotel({ finance: { revenue: [70000], costs: [0] } });
    expect(projectStatus(state, "wing", 10)).toBe("available");
    expect(projectStatus(state, "wing", 20)).toBe("no-funds");
  });

  it("one project at a time", () => {
    const busy = start("spa");
    expect(projectStatus(busy, "eco")).toBe("busy");
    expect(projectStatus(busy, "spa")).toBe("in-progress");
  });

  it("a project is built once", () => {
    const done = finish(start("eco")).hotelState;
    expect(projectStatus(done, "eco")).toBe("built");
    expect(projectStatus(done, "spa")).toBe("available");
  });
});

describe("majorProjectsEngine / starting the works", () => {
  it("pays from the treasury and starts the clock", () => {
    const before = hotel();
    const state = start("eco");
    expect(treasuryOf(state)).toBe(treasuryOf(before) - 40000);
    expect(worksOf(state, "eco")).toEqual({ startedOnDay: 3, completesOnDay: 6 });
    expect(activeProject(state)).toEqual({ id: "eco", startedOnDay: 3, completesOnDay: 6 });
  });

  it("uses the growth capital first, then the treasury", () => {
    const state = start("eco", {}, { expansion: { availableCapital: 25000 } });
    expect(state.expansion.availableCapital).toBe(0);
    expect(treasuryOf(state)).toBe(500000 - 15000);
  });

  it("a bank loan can pay for it", () => {
    const lent = { finance: { revenue: [1000], costs: [0] }, banking: { cashAdjustment: 100000 }, structure: { starRating: 3 } };
    expect(startProject({ hotelState: lent }, "spa", { day: 1 }).hotelState.majorProjects.works.spa).toBeTruthy();
  });

  it("a wing remembers its size and its price", () => {
    const state = start("wing", { size: 15 });
    expect(worksOf(state, "wing")).toEqual({ startedOnDay: 3, completesOnDay: 8, size: 15 });
    expect(treasuryOf(state)).toBe(500000 - 90000);
  });

  it("a wing with no size asked is the smallest", () => {
    expect(worksOf(start("wing"), "wing").size).toBe(10);
  });

  it("does nothing when it cannot be started", () => {
    const poor = bundle({ finance: { revenue: [1000], costs: [0] } });
    expect(startProject(poor, "spa", { day: 1 })).toBe(poor);
    const bad = bundle();
    expect(startProject(bad, "wing", { size: 12 })).toBe(bad);
    expect(startProject(bad, "casino")).toBe(bad);
    const busy = { hotelState: start("spa") };
    expect(startProject(busy, "eco")).toBe(busy);
  });

  it("leaves the rest of the bundle alone", () => {
    const next = startProject(bundle(), "eco", { day: 1 });
    expect(next.rooms).toHaveLength(4);
    expect(next.reservations).toEqual([]);
  });

  it("the works have days left, and the noise costs the guests a point only for the wing", () => {
    expect(worksSatisfactionPenalty(start("wing"))).toBe(WING_NOISE_PENALTY);
    expect(WING_NOISE_PENALTY).toBe(1);
    expect(worksSatisfactionPenalty(start("spa"))).toBe(0);
    expect(worksSatisfactionPenalty(start("eco"))).toBe(0);
  });
});

describe("majorProjectsEngine / the works go on", () => {
  it("nothing is delivered before the day", () => {
    const state = start("eco");
    const early = advanceMajorProjects({ hotelState: state, rooms: baseRooms() }, { day: 5 });
    expect(early.hotelState).toBe(state);
    expect(isBuilt(early.hotelState, "eco")).toBe(false);
  });

  it("the project is delivered on its day", () => {
    const done = advanceMajorProjects({ hotelState: start("eco"), rooms: baseRooms() }, { day: 6 }).hotelState;
    expect(isBuilt(done, "eco")).toBe(true);
    expect(worksOf(done, "eco")).toBeNull();
    expect(activeProject(done)).toBeNull();
    expect(done.majorProjects.built.eco).toEqual({ day: 6 });
    expect(projectsCompletedOn(done, 6)).toEqual([{ id: "project-done:eco:6", projectId: "eco", day: 6 }]);
  });

  it("or later, when a day was skipped", () => {
    expect(isBuilt(advanceMajorProjects({ hotelState: start("eco"), rooms: baseRooms() }, { day: 20 }).hotelState, "eco")).toBe(true);
  });

  it("only once", () => {
    const first = advanceMajorProjects({ hotelState: start("eco"), rooms: baseRooms() }, { day: 6 });
    const again = advanceMajorProjects(first, { day: 7 });
    expect(again.hotelState).toBe(first.hotelState);
    expect(projectsCompletedOn(again.hotelState, 7)).toEqual([]);
  });

  it("the noise stops with the works", () => {
    const done = finish(start("wing")).hotelState;
    expect(worksSatisfactionPenalty(done)).toBe(0);
  });
});

describe("majorProjectsEngine / the wing", () => {
  const wing = (size, rooms = baseRooms()) => finish(start("wing", { size }), rooms);
  const added = (result, rooms = baseRooms()) => result.rooms.slice(rooms.length);

  it.each([
    [10, 7, 3],
    [15, 10, 5],
    [20, 14, 6],
  ])("a wing of %i rooms: %i Deluxe and %i Suites", (size, deluxe, suites) => {
    const rooms = added(wing(size));
    expect(rooms).toHaveLength(size);
    expect(rooms.filter((room) => room.type === "deluxe")).toHaveLength(deluxe);
    expect(rooms.filter((room) => room.type === "suite")).toHaveLength(suites);
  });

  it("the rooms join the hotel's own list, after the existing ones", () => {
    const result = wing(10);
    expect(result.rooms).toHaveLength(14);
    expect(result.rooms.slice(0, 4)).toEqual(baseRooms());
  });

  it("are numbered W01, W02..., with fresh ids", () => {
    const rooms = added(wing(10));
    expect(rooms.map((room) => room.number)).toEqual(Array.from({ length: 10 }, (_, i) => `W${String(i + 1).padStart(2, "0")}`));
    expect(rooms.map((room) => room.id)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it("skip a number already taken", () => {
    const rooms = [...baseRooms(), { id: 9, number: "W01", type: "standard", price: 100, capacity: 2, status: "libre" }];
    const numbers = added(wing(10, rooms), rooms).map((room) => room.number);
    expect(numbers).not.toContain("W01");
    expect(new Set(numbers).size).toBe(10);
  });

  it("are free, clean, upscale and marked as the wing's", () => {
    added(wing(10)).forEach((room) => {
      expect(room).toMatchObject({ status: "libre", housekeeping_status: "clean", metadata: { wing: true } });
      expect(room.capacity).toBeGreaterThanOrEqual(3);
    });
  });

  it("are priced like the hotel's own rooms of that kind", () => {
    const rooms = added(wing(10));
    rooms.filter((room) => room.type === "deluxe").forEach((room) => expect(room.price).toBe(210)); // (200 + 220) / 2
    rooms.filter((room) => room.type === "suite").forEach((room) => expect(room.price).toBe(320)); // no suite yet: the default
  });

  it("the delivery is recorded with its size", () => {
    const { hotelState } = wing(15);
    expect(hotelState.majorProjects.built.wing).toEqual({ day: 40, size: 15 });
    expect(projectsCompletedOn(hotelState, 40)[0]).toMatchObject({ projectId: "wing", size: 15 });
  });
});

describe("majorProjectsEngine / the spa", () => {
  it("raises the room rates by 15 % when it opens, the meeting rooms apart", () => {
    const { rooms } = finish(start("spa"));
    expect(rooms.map((room) => room.price)).toEqual([115, 230, 253, 450]);
    expect(SPA_PRICE_UPLIFT).toBe(0.15);
  });

  it("changes nothing else about the rooms", () => {
    const { rooms } = finish(start("spa"));
    rooms.forEach((room, i) => expect({ ...room, price: 0 }).toEqual({ ...baseRooms()[i], price: 0 }));
  });

  it("does not raise them while it is being built", () => {
    const early = advanceMajorProjects({ hotelState: start("spa"), rooms: baseRooms() }, { day: 5 });
    expect(early.rooms.map((room) => room.price)).toEqual([100, 200, 220, 450]);
  });

  it("makes the hotel more attractive and the V.I.P.s happier once open", () => {
    const { hotelState } = finish(start("spa"));
    expect(spaDemandFactor(hotelState)).toBe(SPA_DEMAND_FACTOR);
    expect(SPA_DEMAND_FACTOR).toBe(1.06);
    expect(spaVipSatisfaction(hotelState)).toBe(SPA_VIP_SATISFACTION);
    expect(spaDemandFactor(start("spa"))).toBe(1);
  });

  it("a wing built after it is priced with the new rates", () => {
    const opened = finish(start("spa"));
    const next = startProject({ hotelState: opened.hotelState, rooms: opened.rooms }, "wing", { size: 10, day: 50 });
    const wing = advanceMajorProjects({ hotelState: next.hotelState, rooms: next.rooms }, { day: 60 });
    expect(wing.rooms.filter((room) => room.metadata?.wing && room.type === "deluxe")[0].price).toBe(Math.round((230 + 253) / 2));
  });
});

describe("majorProjectsEngine / the ecological renovation", () => {
  it("takes effect when it is delivered", () => {
    const { hotelState } = finish(start("eco"));
    expect(ecoUpkeepFactor(hotelState)).toBe(ECO_UPKEEP_FACTOR);
    expect(ECO_UPKEEP_FACTOR).toBe(0.8);
    expect(ecoRatingBonus(hotelState)).toBe(ECO_RATING_BONUS);
    expect(ecoSustainabilityBonus(hotelState)).toBe(ECO_SUSTAINABILITY_BONUS);
    expect(ecoUpkeepFactor(start("eco"))).toBe(1);
  });

  it("leaves the rooms alone", () => {
    expect(finish(start("eco")).rooms).toEqual(baseRooms());
  });
});

describe("majorProjectsEngine / the hotel's stars", () => {
  it("are its own, three when it has no rating", () => {
    expect(effectiveStars(hotel())).toBe(3);
    expect(effectiveStars(hotel({ structure: { starRating: 4 } }))).toBe(4);
    expect(effectiveStars({})).toBe(3);
  });

  it("gain half a star for each project built", () => {
    let state = hotel();
    expect(STARS_PER_PROJECT).toBe(0.5);
    ["eco", "spa", "wing"].forEach((id, i) => {
      state = finish(startProject({ hotelState: state, rooms: baseRooms() }, id, { size: 10, day: 1 }).hotelState).hotelState;
      expect(effectiveStars(state)).toBe(3 + 0.5 * (i + 1));
    });
  });

  it("cross a whole star with two projects", () => {
    const one = finish(start("eco")).hotelState;
    expect(starRating(one)).toBe(3);
    const two = finish(startProject({ hotelState: one, rooms: baseRooms() }, "spa", { day: 1 }).hotelState).hotelState;
    expect(starRating(two)).toBe(4);
  });

  it("never pass five", () => {
    const state = { ...hotel({ structure: { starRating: 5 } }), majorProjects: { built: { wing: { day: 1 }, spa: { day: 1 }, eco: { day: 1 } }, works: {}, log: [] } };
    expect(effectiveStars(state)).toBe(5);
    expect(starRating(state)).toBe(5);
  });

  it("never fall under one", () => {
    expect(effectiveStars(hotel({ structure: { starRating: -4 } }))).toBe(1);
  });
});

describe("majorProjectsEngine / how the interface reads it", () => {
  const byId = (described, id) => described.projects.find((project) => project.id === id);

  it("lists the three, with their status and what they would do to the stars", () => {
    const described = describeProjects(hotel());
    expect(described.projects.map((project) => project.id)).toEqual(["wing", "spa", "eco"]);
    expect(described.stars).toEqual({ current: 3, rating: 3, base: 3, built: 0 });
    described.projects.forEach((project) => {
      expect(project.status).toBe("available");
      expect(project.starsAfter).toBe(3.5);
      expect(project.built).toBe(false);
      expect(project.works).toBeNull();
    });
  });

  it("gives the wing's three sizes with their price and their own status", () => {
    const { sizes } = byId(describeProjects(hotel({ finance: { revenue: [70000], costs: [0] } })), "wing");
    expect(sizes.map((option) => [option.size, option.cost, option.status])).toEqual([[10, 60000, "available"], [15, 90000, "no-funds"], [20, 120000, "no-funds"]]);
    expect(byId(describeProjects(hotel()), "spa").sizes).toBeNull();
  });

  it("follows the works: progress and days left", () => {
    const state = start("spa"); // day 3, ready on day 10
    expect(byId(describeProjects(state, { day: 3 }), "spa").works).toEqual({ startedOnDay: 3, completesOnDay: 10, size: null, daysLeft: 7, progressPercent: 0 });
    expect(byId(describeProjects(state, { day: 6 }), "spa").works).toMatchObject({ daysLeft: 4, progressPercent: 43 });
    expect(byId(describeProjects(state, { day: 10 }), "spa").works).toMatchObject({ daysLeft: 0, progressPercent: 100 });
    expect(byId(describeProjects(state, { day: 99 }), "spa").works).toMatchObject({ daysLeft: 0, progressPercent: 100 });
    expect(byId(describeProjects(state, { day: 0 }), "spa").works.progressPercent).toBe(0);
  });

  it("the others are busy meanwhile", () => {
    const described = describeProjects(start("spa"), { day: 4 });
    expect(byId(described, "spa").status).toBe("in-progress");
    expect(byId(described, "eco").status).toBe("busy");
    expect(described.active).toMatchObject({ id: "spa" });
  });

  it("a built project says when, and how big", () => {
    const { hotelState, rooms } = finish(start("wing", { size: 20 }));
    const described = describeProjects(hotelState, { day: 50, rooms });
    expect(byId(described, "wing")).toMatchObject({ built: true, status: "built", builtOnDay: 40, builtSize: 20, starsAfter: 3.5 });
    expect(described.rooms).toBe(20);
    expect(described.stars).toMatchObject({ current: 3.5, rating: 3, built: 1 });
  });

  it("a project under way shows the wing's size", () => {
    expect(byId(describeProjects(start("wing", { size: 15 }), { day: 4 }), "wing").works.size).toBe(15);
  });
});

describe("majorProjectsEngine / the day's news", () => {
  it("says what was delivered", () => {
    const { hotelState } = advanceMajorProjects({ hotelState: start("wing", { size: 15 }), rooms: baseRooms() }, { day: 8 });
    expect(projectNewsOn(hotelState, 8)[0]).toBe("Chantier terminé : Nouvelle aile de chambres — 15 chambres livrées. Recrutez et formez le personnel pour les accueillir.");
    const spa = finish(start("spa"), baseRooms(), 10).hotelState;
    expect(projectNewsOn(spa, 10)[0]).toBe("Chantier terminé : Espace bien-être & spa de luxe. Tarifs des chambres +15 %.");
  });

  it("and what is still going up", () => {
    expect(projectNewsOn(start("spa"), 5)).toEqual(["Chantier en cours : Espace bien-être & spa de luxe, 5 jours de travaux restants."]);
    expect(projectNewsOn(start("eco"), 5)).toEqual(["Chantier en cours : Rénovation écologique & rooftop RSE, 1 jour de travaux restant."]);
  });

  it("is silent about another day", () => {
    const { hotelState } = finish(start("eco"), baseRooms(), 6);
    expect(projectNewsOn(hotelState, 7)).toEqual([]);
  });
});

describe("majorProjectsEngine / purity", () => {
  it("leaves its input alone and is deterministic", () => {
    const state = start("wing", { size: 10 });
    const rooms = baseRooms();
    const frozen = JSON.stringify({ state, rooms });
    const first = advanceMajorProjects({ hotelState: state, rooms }, { day: 20 });
    const second = advanceMajorProjects({ hotelState: state, rooms }, { day: 20 });
    describeProjects(state, { day: 4, rooms });
    expect(first).toEqual(second);
    expect(JSON.stringify({ state, rooms })).toBe(frozen);
  });

  it("keeps a bounded log", () => {
    let state = hotel({ finance: { revenue: [900000000], costs: [0] } });
    let rooms = baseRooms();
    for (let i = 0; i < 30; i += 1) {
      state = { ...state, majorProjects: { ...(state.majorProjects || {}), built: {}, works: state.majorProjects?.works || {} } };
      const next = startProject({ hotelState: state, rooms }, "eco", { day: i * 10 });
      const done = advanceMajorProjects({ hotelState: next.hotelState, rooms }, { day: i * 10 + 3 });
      state = done.hotelState;
      rooms = done.rooms;
    }
    expect(state.majorProjects.log.length).toBeLessThanOrEqual(20);
  });
});
