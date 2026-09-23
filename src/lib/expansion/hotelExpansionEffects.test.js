import { generateBookings } from "../demand/demandEngine";
import { computeSatisfaction } from "../clients/clientsSatisfaction";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { buildHotelSceneEntities } from "../../ui/hotelView/engine/EntityFactory";
import { startFloorConstruction, fitOutRooms, advanceExpansion, expansionRoomCount, CONSTRUCTION_DAYS, ROOM_KINDS } from "./hotelExpansionEngine";
import { startUpgrade } from "../zones/zoneUpgradesEngine";

const rooms = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, number: String(101 + i), type: "standard", price: 100, status: "libre", housekeeping_status: "clean", floor: 1 }));

function career(capital = 500000) {
  return startCareer({
    playerId: "p",
    startDate: "2026-07-13",
    hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, expansion: { availableCapital: capital } },
    restaurantState: {
      finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
      menu: [{ price: 20, cost: 8, sales: 10 }],
      staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
      operations: [],
      marketing: { budget: 0 },
      esg: {},
    },
    rooms: [{ id: 1, number: "101", type: "standard", price: 100, status: "libre", housekeeping_status: "clean" }],
    reservations: [],
  });
}

// Runs `days` career days in a row.
async function play(state, days) {
  let current = state;
  for (let i = 0; i < days; i += 1) ({ state: current } = await runCareerDay({ state: current, rng: () => 0.999 }));
  return current;
}

describe("expansion / capacity: more rooms absorb more demand", () => {
  const referenceDate = new Date("2026-07-15T12:00:00Z");
  const created = (list) => generateBookings({ rooms: list, reservations: [], referenceDate, multiplier: 1 }).created;

  it("a hotel with more rooms takes more bookings for the same demand", () => {
    const bigger = [...rooms, ...Array.from({ length: 30 }, (_, i) => ({ ...rooms[0], id: 100 + i, number: `5${i}` }))];
    expect(created(bigger)).toBeGreaterThan(created(rooms));
  });

  it("the rooms the expansion adds are bookable like any other", () => {
    let bundle = { hotelState: { expansion: { availableCapital: 900000 } }, rooms };
    bundle = startFloorConstruction(bundle, { day: 0 });
    bundle = { ...bundle, hotelState: advanceExpansion(bundle.hotelState, CONSTRUCTION_DAYS) };
    bundle = fitOutRooms(bundle, 5, "standard", 6);
    expect(expansionRoomCount(bundle.rooms)).toBe(6);
    expect(created(bundle.rooms)).toBeGreaterThanOrEqual(created(rooms));
  });
});

describe("expansion / satisfaction", () => {
  it("construction noise is a signed adjustment like the zone works", () => {
    const inputs = { housekeepingQuality: 70, staffMorale: 70 };
    expect(computeSatisfaction({ ...inputs, upgradeAdjustment: -2 })).toBe(computeSatisfaction(inputs) - 2);
  });
});

describe("expansion / the scene entities", () => {
  const expansionRoom = { id: 900, number: "501", type: "standard", status: "libre", housekeeping_status: "clean", floor: 5, metadata: { expansionFloor: 5 } };
  const roomEntities = (props) => buildHotelSceneEntities({ rooms: [...rooms, expansionRoom], staffCount: 0, diagnostics: [], ...props }).filter((entity) => entity.type === "room");

  it("by default only the base building is drawn, exactly as before (the schematic and scene views are unaffected)", () => {
    const entities = roomEntities();
    expect(entities).toHaveLength(rooms.length);
    expect(entities.some((entity) => entity.metadata.number === "501")).toBe(false);
  });

  it("the base rooms are grouped into floors as if the expansion did not exist", () => {
    const withExpansion = roomEntities().map((entity) => entity.metadata.floorLevel);
    const without = buildHotelSceneEntities({ rooms, staffCount: 0, diagnostics: [] }).filter((entity) => entity.type === "room").map((entity) => entity.metadata.floorLevel);
    expect(withExpansion).toEqual(without);
  });

  it("on request, expansion rooms come as room entities on their own floor level", () => {
    const entity = roomEntities({ includeExpansion: true }).find((item) => item.metadata.number === "501");
    expect(entity).toMatchObject({ id: "room:900", type: "room", state: "clean", metadata: { floorLevel: 5, roomId: 900, expansion: true } });
  });

  it("their state follows the same rules (occupied, dirty, cleaning)", () => {
    const dirty = roomEntities({ includeExpansion: true, rooms: [{ ...expansionRoom, housekeeping_status: "dirty" }] });
    expect(dirty.find((item) => item.metadata.number === "501").state).toBe("dirty");
    const cleaning = roomEntities({ includeExpansion: true, cleaningRoomIds: new Set([900]) });
    expect(cleaning.find((item) => item.metadata.number === "501").state).toBe("cleaning");
  });
});

describe("expansion / through the career day", () => {
  it("a floor started on day 0 is built five days later and reported in that day's review", async () => {
    let state = career();
    state = { ...state, hotel: startFloorConstruction(state.hotel, { day: state.day }) };
    expect(state.hotel.hotelState.expansion.availableCapital).toBe(500000 - 150000);

    state = await play(state, CONSTRUCTION_DAYS - 1);
    expect(state.hotel.hotelState.buildingExpansion.floors[5].status).toBe("building");

    state = await play(state, 1);
    expect(state.hotel.hotelState.buildingExpansion.floors[5].status).toBe("built");
    const review = buildDailyReview({ careerState: state, dashboardState: { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } } });
    expect(review.causalChain.some((line) => /Gros œuvre terminé : l'étage 5/.test(line))).toBe(true);
  });

  it("rooms fitted out stay in the hotel from one day to the next, and the day still runs", async () => {
    let state = career();
    state = { ...state, hotel: startFloorConstruction(state.hotel, { day: state.day }) };
    state = await play(state, CONSTRUCTION_DAYS);
    state = { ...state, hotel: fitOutRooms(state.hotel, 5, "suite", 2) };
    expect(state.hotel.rooms).toHaveLength(3);

    state = await play(state, 2);
    expect(state.hotel.rooms.filter((room) => room.floor === 5)).toHaveLength(2);
    expect(state.hotel.hotelState.expansion.availableCapital).toBe(500000 - 150000 - 2 * ROOM_KINDS.suite.cost);
  });

  it("a career that never expands is completely unaffected", async () => {
    const state = await play(career(), 1);
    expect(state.hotel.hotelState.buildingExpansion).toBeUndefined();
  });
});

describe("expansion / funding shared with the zone upgrades", () => {
  it("an upgrade the capital can't cover is paid from the treasury", () => {
    const bundle = { hotelState: { expansion: { availableCapital: 2000 }, finance: { revenue: [20000], costs: [0] } } };
    const result = startUpgrade(bundle, "rooms-bedding", { day: 0 }); // 8 000 €
    expect(result.hotelState.zoneUpgrades.works["rooms-bedding"]).toBeDefined();
    expect(result.hotelState.expansion.availableCapital).toBe(0);
    expect(result.hotelState.finance.costs).toEqual([6000]);
  });

  it("without capital or treasury enough, nothing starts", () => {
    const bundle = { hotelState: { expansion: { availableCapital: 2000 }, finance: { revenue: [3000], costs: [0] } } };
    expect(startUpgrade(bundle, "rooms-bedding", { day: 0 })).toBe(bundle);
  });
});
