import {
  TARGET_SATISFACTION,
  BASE_MIN,
  BASE_SPAN,
  UPGRADE_BONUS_MIN,
  UPGRADE_BONUS_SPAN,
  PERSONAL_BONUS,
  PRAISE_BONUS_MIN,
  PRAISE_BONUS_SPAN,
  GIFTS,
  INCIDENT_PENALTY,
  CONDITION_PENALTY,
  CONDITION_BONUS,
  REPUTATION_PENALTY,
  WAITING_PENALTY,
  CLEANING_PENALTY,
  UNLUCKY_PENALTY,
  vipServiceRecord,
  hasAttention,
  upgradeBonusFor,
  praiseBonusFor,
  ratingFromSatisfaction,
  vipSatisfaction,
  vipStayOutcome,
  pressHighlightFor,
  describeVipGuests,
  findFreeSuite,
  findPersonalServer,
  vipActionOptions,
  applyVipAction,
} from "./vipServiceEngine";
import { isVip, mixedRandom, UNLUCKY_STAY_CHANCE } from "./guestProfiles";
import { createEmployee } from "../staff/staffRoster";
import { treasuryOf } from "../finance/investmentFunding";

// A January stay: no roadworks can fall there (lib/seasonEvents/), so these tests read the gauge without the calendar.
const DATE = new Date("2027-01-13T12:00:00Z");
const ids = (count) => Array.from({ length: count }, (_, i) => i + 1);
const stay = (id, extra = {}) => ({ id, room_id: 1, room: "101", room_type: "standard", client_name: `Client ${id}`, arrival: "2027-01-12", departure: "2027-01-15", status: "confirmée", segment: "leisure", price: 120, ...extra });
const room = (id, number, type, extra = {}) => ({ id, number, type, status: "libre", ...extra });
const rooms = [room(1, "101", "standard", { status: "occupée" }), room(2, "301", "suite"), room(3, "302", "suite")];

// A V.I.P. in a standard room, and one the luck doesn't turn against.
const isLucky = (id) => mixedRandom(`unlucky:${id}`) >= UNLUCKY_STAY_CHANCE;
const VIP = ids(4000).find((id) => isVip(stay(id), rooms[0]) && isLucky(id));
const UNLUCKY_VIP = ids(6000).find((id) => isVip(stay(id), rooms[0]) && !isLucky(id));
const rich = (extra = {}) => ({ finance: { revenue: [10000], costs: [0] }, ...extra });
const roster = (...employees) => ({ staffRoster: employees.map((employee) => createEmployee({ day: 0, ...employee })) });
const experienced = { id: "e1", name: "Lina", role: "housekeeping", level: "experienced" };
const context = (hotelState = rich(), reservations = [stay(VIP)], roomList = rooms) => ({ hotelState, reservations, rooms: roomList, date: DATE });
const bundle = (hotelState = rich(), reservations = [stay(VIP)], roomList = rooms) => ({ hotelState, reservations, rooms: roomList });
const option = (ctx, id, reservationId = VIP) => vipActionOptions(ctx, reservationId).find((item) => item.id === id);

describe("vipServiceEngine / constants", () => {
  it("the target is 85, the gifts cost 50 to 150 EUR, the upgrade brings 20 to 40, praise 3 to 5", () => {
    expect(TARGET_SATISFACTION).toBe(85);
    expect(Object.values(GIFTS).map((gift) => gift.cost)).toEqual([50, 100, 150]);
    expect(UPGRADE_BONUS_MIN).toBe(20);
    expect(UPGRADE_BONUS_MIN + UPGRADE_BONUS_SPAN - 1).toBe(40);
    expect(PRAISE_BONUS_MIN).toBe(3);
    expect(PRAISE_BONUS_MIN + PRAISE_BONUS_SPAN - 1).toBe(5);
    const bonuses = Object.values(GIFTS).map((gift) => gift.bonus);
    expect([...bonuses].sort((a, b) => a - b)).toEqual(bonuses);
  });

  it("the bonuses are stable per stay and within range", () => {
    ids(80).forEach((id) => {
      expect(upgradeBonusFor(id)).toBe(upgradeBonusFor(id));
      expect(upgradeBonusFor(id)).toBeGreaterThanOrEqual(20);
      expect(upgradeBonusFor(id)).toBeLessThanOrEqual(40);
      expect(praiseBonusFor(id)).toBeGreaterThanOrEqual(3);
      expect(praiseBonusFor(id)).toBeLessThanOrEqual(5);
    });
    expect(new Set(ids(80).map(upgradeBonusFor)).size).toBeGreaterThan(5);
  });

  it("the rating follows the satisfaction: 5 from 85, 4 from 70, 3 from 55, 2 from 40, else 1", () => {
    expect([100, 85, 84, 70, 69, 55, 54, 40, 39, 0].map(ratingFromSatisfaction)).toEqual([5, 5, 4, 4, 3, 3, 2, 2, 1, 1]);
  });
});

describe("vipServiceEngine / the satisfaction gauge", () => {
  const gauge = (hotelState = rich(), id = VIP) => vipSatisfaction({ reservation: stay(id), hotelState });

  it("starts from a base of 55 to 85 that is the guest's own, stable", () => {
    ids(60).forEach((id) => {
      const { base } = vipSatisfaction({ reservation: stay(id), hotelState: rich() });
      expect(base).toBeGreaterThanOrEqual(BASE_MIN);
      expect(base).toBeLessThanOrEqual(BASE_MIN + BASE_SPAN);
      expect(vipSatisfaction({ reservation: stay(id), hotelState: rich() }).score).toBe(vipSatisfaction({ reservation: stay(id), hotelState: rich() }).score);
    });
  });

  it("a normal hotel leaves it at its base", () => {
    const result = gauge();
    expect(result.score).toBe(result.base);
    expect(result.lines).toEqual([]);
  });

  it("unrepaired breakdowns cost 15 each, up to 30", () => {
    const open = (count) => ({ activeIncidents: Array.from({ length: count }, (_, i) => ({ id: `i${i}`, status: "active", severity: "minor", daysOpen: 2 })) });
    expect(gauge(rich(open(1))).score).toBe(gauge().score - INCIDENT_PENALTY);
    expect(gauge(rich(open(5))).score).toBe(gauge().score - 2 * INCIDENT_PENALTY);
  });

  it("a breakdown from today is not counted yet, nor is a repaired one", () => {
    expect(gauge(rich({ activeIncidents: [{ id: "i", status: "active", severity: "minor", daysOpen: 0 }] })).score).toBe(gauge().score);
    expect(gauge(rich({ activeIncidents: [{ id: "i", status: "resolved", severity: "minor", daysOpen: 5 }] })).score).toBe(gauge().score);
  });

  it("a run-down hotel loses points, an impeccable one gains a few", () => {
    expect(gauge(rich({ maintenance: { level: "economy", condition: 30 } })).score).toBe(gauge().score - CONDITION_PENALTY);
    expect(gauge(rich({ maintenance: { level: "premium", condition: 95 } })).score).toBe(gauge().score + CONDITION_BONUS);
  });

  it("a poor reputation costs points", () => {
    expect(gauge(rich({ progression: { player: { reputation: 20 } } })).score).toBe(gauge().score - REPUTATION_PENALTY);
  });

  it("an unlucky stay costs 20", () => {
    const lucky = vipSatisfaction({ reservation: stay(UNLUCKY_VIP), hotelState: rich() });
    expect(lucky.lines.find((line) => line.key === "unlucky").value).toBe(-UNLUCKY_PENALTY);
  });

  it("understaffing at the reception and in housekeeping costs waiting and unmade-room points, only with a roster", () => {
    const short = { ...roster(experienced), staffing: { receptionCoverage: 0.5, housekeepingCoverage: 0.6 } };
    expect(gauge(rich(short)).score).toBe(gauge().score - WAITING_PENALTY - CLEANING_PENALTY);
    expect(gauge(rich({ staffing: short.staffing })).score).toBe(gauge().score); // no roster: nothing to blame
    expect(gauge(rich({ ...short, staffing: { receptionCoverage: 1.2, housekeepingCoverage: 1 } })).score).toBe(gauge().score);
  });

  it("the score stays within 0..100 and says whether the target is reached", () => {
    const awful = { activeIncidents: ids(4).map((i) => ({ id: `i${i}`, status: "active", severity: "minor", daysOpen: 3 })), maintenance: { level: "economy", condition: 0 }, progression: { player: { reputation: 0 } } };
    expect(gauge(rich(awful), UNLUCKY_VIP).score).toBeGreaterThanOrEqual(0);
    const stayed = { vipService: { stays: { [VIP]: { upgrade: { bonus: 40 }, gift: { bonus: 28 }, personal: { bonus: 8 } } } } };
    expect(gauge(rich(stayed)).score).toBe(100);
    expect(gauge(rich(stayed)).reached).toBe(true);
  });

  it("every attention shows as a line of the gauge", () => {
    const stayed = { vipService: { stays: { [VIP]: { upgrade: { bonus: 30 }, gift: { bonus: 20 }, personal: { bonus: 8 } } } } };
    const lines = gauge(rich(stayed)).lines;
    expect(lines.map((line) => line.key)).toEqual(["upgrade", "gift", "personal"]);
    expect(lines.map((line) => line.value)).toEqual([30, 20, 8]);
  });

  it("a personal service cancels the waiting and cleaning losses and adds its bonus", () => {
    const short = { ...roster(experienced), staffing: { receptionCoverage: 0.5, housekeepingCoverage: 0.6 } };
    const served = { ...short, vipService: { stays: { [VIP]: { personal: { bonus: PERSONAL_BONUS, employeeId: "e1" } } } } };
    expect(gauge(rich(served)).score).toBe(gauge().score + PERSONAL_BONUS);
    expect(gauge(rich(served)).lines.map((line) => line.key)).toEqual(["personal"]);
  });
});

describe("vipServiceEngine / what the V.I.P. writes at departure", () => {
  const outcome = (hotelState) => vipStayOutcome({ reservation: stay(VIP), hotelState });

  it("without attentions, the rating follows the satisfaction, never a glowing review", () => {
    const result = outcome(rich());
    expect(result.rating).toBe(ratingFromSatisfaction(result.satisfaction));
    expect(result).toMatchObject({ praise: false, praiseBonus: 0 });
  });

  it("attentions that reach 85 earn a glowing review and a 3-5 point bonus", () => {
    const result = outcome(rich({ vipService: { stays: { [VIP]: { upgrade: { bonus: 40 }, gift: { bonus: 28 } } } } }));
    expect(result).toMatchObject({ rating: 5, praise: true });
    expect(result.praiseBonus).toBeGreaterThanOrEqual(3);
    expect(result.praiseBonus).toBeLessThanOrEqual(5);
  });

  it("attentions that fall short give a better rating but no boost", () => {
    const plain = outcome(rich());
    const result = outcome(rich({ vipService: { stays: { [VIP]: { gift: { bonus: 1 } } } }, maintenance: { level: "economy", condition: 10 } }));
    expect(result.praise).toBe(false);
    expect(result.satisfaction).toBeLessThan(TARGET_SATISFACTION);
    expect(plain.satisfaction).toBeGreaterThan(0);
  });

  it("a flawless stay with no attention is five stars, without the boost", () => {
    const flawless = ids(4000).find((id) => isVip(stay(id), rooms[0]) && vipSatisfaction({ reservation: stay(id), hotelState: rich({ maintenance: { level: "premium", condition: 95 } }) }).reached);
    const result = vipStayOutcome({ reservation: stay(flawless), hotelState: rich({ maintenance: { level: "premium", condition: 95 } }) });
    expect(result.rating).toBe(5);
    expect(result.praise).toBe(false);
  });

  it("the feature article names the guest and the audience", () => {
    const highlight = pressHighlightFor({ reservation: stay(VIP), review: { id: `stay:${VIP}`, day: 5, guestName: `Client ${VIP}`, text: "Bravo" } });
    expect(highlight).toMatchObject({ id: `press:stay:${VIP}`, day: 5, guestName: `Client ${VIP}`, text: "Bravo" });
    expect(highlight.headline).toMatch(/abonnés/);
    expect(highlight.followers).toBeGreaterThanOrEqual(20000);
  });

  it("hasAttention tells whether anything was given", () => {
    expect(hasAttention({})).toBe(false);
    expect(hasAttention({ gift: { bonus: 1 } })).toBe(true);
    expect(hasAttention(vipServiceRecord({}, 4))).toBe(false);
  });
});

describe("vipServiceEngine / the V.I.P.s in the hotel", () => {
  it("lists them with their profile, satisfaction, whether the target is reached and what they were given", () => {
    const [guest] = describeVipGuests(context(rich({ vipService: { stays: { [VIP]: { gift: { bonus: 12 } } } } })));
    expect(guest).toMatchObject({ reservationId: VIP, roomNumber: "101", attentions: ["gift"] });
    expect(guest.profile.label).toMatch(/v\.i\.p\./i);
    expect(guest.satisfaction).toBeGreaterThan(0);
    expect(typeof guest.reached).toBe("boolean");
    expect(guest.followers).toBeGreaterThanOrEqual(20000);
  });

  it("nobody when no V.I.P. is in the hotel", () => {
    expect(describeVipGuests(context(rich(), []))).toEqual([]);
    expect(describeVipGuests()).toEqual([]);
  });
});

describe("vipServiceEngine / the attentions on offer", () => {
  it("five choices: the upgrade, three gifts, the personal service", () => {
    expect(vipActionOptions(context(), VIP).map((item) => item.id)).toEqual(["upgrade", "gift:flowers", "gift:champagne", "gift:basket", "personal"]);
  });

  it("nothing for a guest who is not a V.I.P. in the hotel", () => {
    expect(vipActionOptions(context(), 99999)).toEqual([]);
    expect(vipActionOptions(context(rich(), [stay(VIP)]), VIP + 1)).toEqual([]);
  });

  it("the upgrade is free, and available with a free suite", () => {
    expect(option(context(), "upgrade")).toMatchObject({ cost: 0, available: true, reason: "" });
    expect(option(context(), "upgrade").bonus).toBe("+20 à +40");
  });

  it("no upgrade when every suite is taken for the rest of the stay", () => {
    const taken = [stay(VIP), stay(9001, { room_id: 2, room: "301", room_type: "suite" }), stay(9002, { room_id: 3, room: "302", room_type: "suite" })];
    expect(findFreeSuite({ reservation: taken[0], rooms, reservations: taken })).toBeUndefined();
    expect(option(context(rich(), taken), "upgrade")).toMatchObject({ available: false, reason: "Aucune suite libre" });
  });

  it("a suite occupied only after the V.I.P. leaves is still free for the stay", () => {
    const later = [stay(VIP), stay(9001, { room_id: 2, room: "301", room_type: "suite", arrival: "2027-01-15", departure: "2027-01-17" })];
    expect(findFreeSuite({ reservation: later[0], rooms, reservations: later }).id).toBe(2);
  });

  it("a suite out of service is not offered", () => {
    const broken = [rooms[0], { ...rooms[1], status: "maintenance" }, { ...rooms[2], status: "hors_service" }];
    expect(option(context(rich(), [stay(VIP)], broken), "upgrade").available).toBe(false);
  });

  it("no upgrade for a V.I.P. already in a suite", () => {
    const inSuite = [stay(VIP, { room_id: 2, room: "301", room_type: "suite" })];
    expect(option(context(rich(), inSuite), "upgrade")).toMatchObject({ available: false, reason: "Déjà en suite" });
  });

  it("each gift shows its cost and is disabled when the treasury can't pay", () => {
    expect(option(context(), "gift:champagne")).toMatchObject({ cost: 100, available: true });
    const poor = rich({ finance: { revenue: [80], costs: [0] } });
    expect(option(context(poor), "gift:flowers")).toMatchObject({ available: true });
    expect(option(context(poor), "gift:basket")).toMatchObject({ available: false, reason: "Trésorerie insuffisante" });
  });

  it("the personal service needs an experienced or expert housekeeper or receptionist", () => {
    expect(option(context(), "personal")).toMatchObject({ available: false, reason: expect.stringMatching(/aucun gouvernant ou réceptionniste expérimenté/i) });
    expect(option(context(rich(roster(experienced))), "personal")).toMatchObject({ available: true });
    expect(option(context(rich(roster({ ...experienced, level: "beginner" }))), "personal").available).toBe(false);
    expect(option(context(rich(roster({ ...experienced, role: "maintenance" }))), "personal").available).toBe(false);
    expect(option(context(rich(roster({ ...experienced, role: "reception", level: "expert" }))), "personal").available).toBe(true);
  });

  it("not someone on sick leave or in training", () => {
    expect(findPersonalServer({ hotelState: { staffRoster: [{ ...createEmployee({ ...experienced }), sick: true }] }, reservationId: VIP, inHouseIds: new Set([VIP]) })).toBeUndefined();
    expect(findPersonalServer({ hotelState: { staffRoster: [{ ...createEmployee({ ...experienced }), training: { daysLeft: 2 } }] }, reservationId: VIP, inHouseIds: new Set([VIP]) })).toBeUndefined();
  });

  it("prefers an expert to an experienced employee, and names them in the description", () => {
    const state = rich(roster(experienced, { id: "e2", name: "Zoé", role: "reception", level: "expert" }));
    expect(findPersonalServer({ hotelState: state, reservationId: VIP, inHouseIds: new Set([VIP]) }).name).toBe("Zoé");
    expect(option(context(state), "personal").description).toMatch(/Zoé.*réception/);
  });

  it("an attention already given is marked done and unavailable", () => {
    const given = rich({ vipService: { stays: { [VIP]: { upgrade: { bonus: 30 }, gift: { bonus: 12 }, personal: { bonus: 8 } } } }, ...roster(experienced) });
    ["upgrade", "gift:flowers", "gift:champagne", "gift:basket", "personal"].forEach((id) => expect(option(context(given), id)).toMatchObject({ done: true, available: false }));
  });
});

describe("vipServiceEngine / giving the attentions", () => {
  it("the upgrade moves the V.I.P. to a free suite at the same price, and frees the old room", () => {
    const result = applyVipAction(bundle(), VIP, { type: "upgrade" }, { day: 4, date: DATE });
    const moved = result.reservations.find((item) => item.id === VIP);
    expect(moved).toMatchObject({ room_id: 2, room: "301", room_type: "suite", price: 120 });
    expect(result.rooms.find((item) => item.id === 1).status).toBe("libre");
    expect(result.rooms.find((item) => item.id === 2).status).toBe("occupée");
    const record = vipServiceRecord(result.hotelState, VIP);
    expect(record.upgrade).toMatchObject({ day: 4, fromRoomId: 1, toRoomId: 2, toRoomNumber: "301" });
    expect(record.upgrade.bonus).toBe(upgradeBonusFor(VIP));
  });

  it("the upgrade raises the satisfaction by its bonus and costs nothing", () => {
    const before = bundle();
    const result = applyVipAction(before, VIP, { type: "upgrade" }, { day: 4, date: DATE });
    const gain = vipSatisfaction({ reservation: result.reservations[0], hotelState: result.hotelState }).score - vipSatisfaction({ reservation: before.reservations[0], hotelState: before.hotelState }).score;
    expect(gain).toBeGreaterThan(0);
    expect(treasuryOf(result.hotelState)).toBe(treasuryOf(before.hotelState));
  });

  it("the V.I.P. now sits in the suite: the room the alert points to changes", () => {
    const result = applyVipAction(bundle(), VIP, { type: "upgrade" }, { day: 4, date: DATE });
    expect(describeVipGuests({ hotelState: result.hotelState, reservations: result.reservations, rooms: result.rooms, date: DATE })[0]).toMatchObject({ roomId: 2, roomNumber: "301" });
  });

  it("a gift is paid from the treasury, as a one-off cost of the month, and recorded", () => {
    const before = bundle();
    const result = applyVipAction(before, VIP, { type: "gift", giftId: "champagne" }, { day: 4, date: DATE });
    expect(result.hotelState.finance.costs).toEqual([100]);
    expect(treasuryOf(result.hotelState)).toBe(treasuryOf(before.hotelState) - 100);
    expect(vipServiceRecord(result.hotelState, VIP).gift).toMatchObject({ id: "champagne", cost: 100, bonus: GIFTS.champagne.bonus, day: 4 });
  });

  it("a bigger gift raises the satisfaction more", () => {
    const at = (giftId) => {
      const result = applyVipAction(bundle(), VIP, { type: "gift", giftId }, { day: 4, date: DATE });
      return vipSatisfaction({ reservation: result.reservations[0], hotelState: result.hotelState }).score;
    };
    expect(at("champagne")).toBeGreaterThanOrEqual(at("flowers"));
    expect(at("basket")).toBeGreaterThanOrEqual(at("champagne"));
  });

  it("the personal service ties the employee to the guest and adds its bonus", () => {
    const result = applyVipAction(bundle(rich(roster(experienced))), VIP, { type: "personal" }, { day: 4, date: DATE });
    expect(vipServiceRecord(result.hotelState, VIP).personal).toMatchObject({ employeeId: "e1", employeeName: "Lina", bonus: PERSONAL_BONUS });
  });

  it("the same employee can't look after two V.I.P.s at once", () => {
    const other = ids(6000).find((id) => id !== VIP && isVip(stay(id, { room_id: 3 }), rooms[2]));
    const reservations = [stay(VIP), stay(other, { room_id: 3, room: "302", room_type: "suite" })];
    const first = applyVipAction(bundle(rich(roster(experienced)), reservations), VIP, { type: "personal" }, { day: 4, date: DATE });
    expect(option({ ...context(first.hotelState, reservations), rooms: first.rooms }, "personal", other)).toMatchObject({ available: false });
  });

  it("each attention only once per stay: a second one changes nothing", () => {
    const once = applyVipAction(bundle(), VIP, { type: "gift", giftId: "flowers" }, { day: 4, date: DATE });
    expect(applyVipAction(once, VIP, { type: "gift", giftId: "basket" }, { day: 4, date: DATE })).toBe(once);
    const upgraded = applyVipAction(bundle(), VIP, { type: "upgrade" }, { day: 4, date: DATE });
    expect(applyVipAction(upgraded, VIP, { type: "upgrade" }, { day: 4, date: DATE })).toBe(upgraded);
  });

  it("can combine all three, and the V.I.P. ends up satisfied", () => {
    let result = bundle(rich(roster(experienced)));
    result = applyVipAction(result, VIP, { type: "upgrade" }, { day: 4, date: DATE });
    result = applyVipAction(result, VIP, { type: "gift", giftId: "champagne" }, { day: 4, date: DATE });
    result = applyVipAction(result, VIP, { type: "personal" }, { day: 4, date: DATE });
    expect(Object.keys(vipServiceRecord(result.hotelState, VIP)).sort()).toEqual(["gift", "personal", "upgrade"]);
    expect(describeVipGuests({ hotelState: result.hotelState, reservations: result.reservations, rooms: result.rooms, date: DATE })[0].reached).toBe(true);
  });

  it("refuses, changing nothing, what isn't available: no funds, no suite, no employee, unknown attention, not a V.I.P.", () => {
    const poor = bundle(rich({ finance: { revenue: [10], costs: [0] } }));
    expect(applyVipAction(poor, VIP, { type: "gift", giftId: "basket" }, { date: DATE })).toBe(poor);
    const noSuite = bundle(rich(), [stay(VIP)], [rooms[0]]);
    expect(applyVipAction(noSuite, VIP, { type: "upgrade" }, { date: DATE })).toBe(noSuite);
    const start = bundle();
    expect(applyVipAction(start, VIP, { type: "personal" }, { date: DATE })).toBe(start);
    expect(applyVipAction(start, VIP, { type: "champagne-shower" }, { date: DATE })).toBe(start);
    expect(applyVipAction(start, VIP, { type: "gift", giftId: "gold" }, { date: DATE })).toBe(start);
    expect(applyVipAction(start, 99999, { type: "upgrade" }, { date: DATE })).toBe(start);
  });

  it("does not mutate its input", () => {
    const start = bundle(rich(roster(experienced)));
    const snapshot = JSON.stringify(start);
    applyVipAction(start, VIP, { type: "upgrade" }, { day: 4, date: DATE });
    applyVipAction(start, VIP, { type: "gift", giftId: "flowers" }, { day: 4, date: DATE });
    applyVipAction(start, VIP, { type: "personal" }, { day: 4, date: DATE });
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});
