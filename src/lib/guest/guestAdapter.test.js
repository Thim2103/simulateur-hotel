import { createGuestHotelBundle, createStarterInnBundle, createGuestRepository, ensureGuestAuthSession, requireGuestUserId } from "./guestAdapter";
import { treasuryOf } from "../finance/investmentFunding";

beforeEach(() => {
  window.localStorage.clear();
});

test("ensureGuestAuthSession resolves to a guest id, mirroring ensureAuthSession()'s contract", async () => {
  const userId = await ensureGuestAuthSession();
  expect(userId).toMatch(/^guest-/);
});

test("requireGuestUserId never throws, unlike requireUserId() for an unauthenticated Supabase session", async () => {
  await expect(requireGuestUserId()).resolves.toMatch(/^guest-/);
});

test("ensureGuestAuthSession/requireGuestUserId return the same id across calls", async () => {
  const first = await ensureGuestAuthSession();
  const second = await requireGuestUserId();
  expect(second).toBe(first);
});

test("createGuestRepository get()/save() round-trip through guestState", async () => {
  const repository = createGuestRepository("career", { defaultState: null });
  expect(await repository.get()).toBeNull();

  await repository.save({ day: 1 });
  expect(await repository.get()).toEqual({ day: 1 });
});

test("createGuestRepository clear() resets to the configured default", async () => {
  const repository = createGuestRepository("career", { defaultState: { day: 0 } });
  await repository.save({ day: 5 });
  repository.clear();
  expect(await repository.get()).toEqual({ day: 0 });
});

test("createGuestHotelBundle returns a fully playable hotel/restaurant/PMS bundle", () => {
  const bundle = createGuestHotelBundle({ referenceDate: new Date("2026-09-10T00:00:00Z") });

  expect(bundle.hotelState.structure).toBeDefined();
  expect(bundle.restaurantState.progression.ready).toBe(true);
  expect(bundle.restaurantState.staff.length).toBeGreaterThan(0);
  expect(bundle.rooms.length).toBeGreaterThan(0);
  expect(bundle.reservations.length).toBeGreaterThan(0);
});

test("createGuestHotelBundle's reservations reference real room ids", () => {
  const bundle = createGuestHotelBundle({ referenceDate: new Date("2026-09-10T00:00:00Z") });
  const roomIds = new Set(bundle.rooms.map((room) => room.id));
  expect(bundle.reservations.every((reservation) => roomIds.has(reservation.room_id))).toBe(true);
});

test("createGuestHotelBundle never mutates the shared default hotel/restaurant state objects", () => {
  const bundleA = createGuestHotelBundle();
  bundleA.hotelState.progression.cycles = 999;
  bundleA.restaurantState.pmsContext.hotelOccupancy = 50;

  const bundleB = createGuestHotelBundle();
  expect(bundleB.hotelState.progression.cycles).toBe(0);
  expect(bundleB.restaurantState.pmsContext.hotelOccupancy).toBe(0);
});

// "Ma Première Auberge" (Étape 3): what a brand-new career actually
// starts from, deliberately much smaller than the PMS/RM demo bundle
// above.
describe("createStarterInnBundle", () => {
  test("starts with exactly 4 simple rooms and no reservations yet", () => {
    const bundle = createStarterInnBundle();
    expect(bundle.rooms).toHaveLength(4);
    expect(bundle.rooms.map((room) => room.number)).toEqual(["101", "102", "103", "104"]);
    expect(bundle.rooms.every((room) => room.type === "standard")).toBe(true);
    expect(bundle.reservations).toEqual([]);
  });

  test("starts with a 10 000 € treasury", () => {
    const bundle = createStarterInnBundle();
    expect(treasuryOf(bundle.hotelState)).toBe(10000);
  });

  test("is otherwise a fully playable hotel/restaurant bundle, same contract as createGuestHotelBundle", () => {
    const bundle = createStarterInnBundle();
    expect(bundle.hotelState.structure).toBeDefined();
    expect(bundle.restaurantState.progression.ready).toBe(true);
    expect(bundle.restaurantState.staff.length).toBeGreaterThan(0);
  });

  test("never mutates the shared default hotel/restaurant state objects", () => {
    const bundleA = createStarterInnBundle();
    bundleA.hotelState.progression.cycles = 999;
    const bundleB = createStarterInnBundle();
    expect(bundleB.hotelState.progression.cycles).toBe(0);
  });
});
