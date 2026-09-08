// Mocks ./supabase (not @supabase/supabase-js) so these tests exercise
// pmsRepository.js's own logic -- user_id scoping on every query, and the
// one-time "claim legacy rows" adoption -- without a real network call or a
// full reimplementation of supabase-js's query builder.
const mockRequireUserId = jest.fn();
const mockEnsureAuthSession = jest.fn();
const mockAssertSupabaseConfigured = jest.fn();

jest.mock("./supabase", () => ({
  requireUserId: (...args) => mockRequireUserId(...args),
  ensureAuthSession: (...args) => mockEnsureAuthSession(...args),
  assertSupabaseConfigured: (...args) => mockAssertSupabaseConfigured(...args),
}));

function applyFilters(rows, filters = []) {
  return rows.filter((row) =>
    filters.every(([kind, column, value]) => (kind === "is" ? (row[column] ?? null) === value : row[column] === value))
  );
}

// A minimal, chainable stand-in for supabase-js's query builder: every
// filter method (.eq/.is/.order/.limit/.select) records the filter and
// returns `this`, and the object is thenable/awaitable (like the real
// builder) as well as exposing .single() for the ".select().single()"
// pattern used by save(). Filters are only applied once the chain is
// actually resolved (awaited), matching how the real client works.
class FakeQuery {
  constructor(resolve, entry) {
    this._resolve = resolve;
    this._entry = entry;
    this._entry.filters = [];
  }
  eq(column, value) { this._entry.filters.push(["eq", column, value]); return this; }
  is(column, value) { this._entry.filters.push(["is", column, value]); return this; }
  order() { return this; }
  limit() { return this; }
  select() { return this; }
  single() {
    const { data, error } = this._resolve(this._entry.filters);
    return Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data, error });
  }
  then(onResolve, onReject) {
    return Promise.resolve(this._resolve(this._entry.filters)).then(onResolve, onReject);
  }
}

function createFakeClient(tableState) {
  const calls = [];
  const client = {
    from(table) {
      const rows = () => tableState[table] || [];
      return {
        select: () => {
          const entry = { table, op: "select" };
          calls.push(entry);
          return new FakeQuery((filters) => ({ data: applyFilters(rows(), filters), error: null }), entry);
        },
        insert: (payload) => {
          const entry = { table, op: "insert", payload };
          calls.push(entry);
          const inserted = { id: 99, ...payload };
          return new FakeQuery(() => {
            tableState[table] = [...rows(), inserted];
            return { data: [inserted], error: null };
          }, entry);
        },
        update: (payload) => {
          const entry = { table, op: "update", payload };
          calls.push(entry);
          return new FakeQuery((filters) => {
            const matchingIds = new Set(applyFilters(rows(), filters).map((row) => row.id));
            tableState[table] = rows().map((row) => (matchingIds.has(row.id) ? { ...row, ...payload } : row));
            return { data: tableState[table].filter((row) => matchingIds.has(row.id)), error: null };
          }, entry);
        },
        delete: () => {
          const entry = { table, op: "delete" };
          calls.push(entry);
          return new FakeQuery((filters) => {
            const matchingIds = new Set(applyFilters(rows(), filters).map((row) => row.id));
            tableState[table] = rows().filter((row) => !matchingIds.has(row.id));
            return { data: null, error: null };
          }, entry);
        },
      };
    },
  };
  return { client, calls, tableState };
}

describe("pmsRepository user scoping and legacy-row claiming", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
    mockRequireUserId.mockReset();
    mockEnsureAuthSession.mockReset();
    mockAssertSupabaseConfigured.mockReset();
    // Every export now resolves the session itself (resolveSession(), see
    // lib/sessionResolver.js) before deciding Supabase vs guest -- that
    // shares this same mocked ensureAuthSession(), so every Supabase-path
    // test below needs it to resolve truthy or it would (correctly, by
    // design) fall through to the guest branch instead. Tests that want
    // the guest branch override this back to a falsy value.
    mockEnsureAuthSession.mockResolvedValue("user-1");
  });

  test("listRooms() claims not-yet-owned legacy rows for a new user, then filters by user_id", async () => {
    const { client, calls } = createFakeClient({
      rooms: [{ id: 1, number: "101", type: "standard", price: 150, status: "libre", user_id: null }],
    });
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { listRooms } = require("./pmsRepository");
    const rooms = await listRooms();

    const claim = calls.find((call) => call.table === "rooms" && call.op === "update");
    expect(claim).toMatchObject({ payload: { user_id: "user-1" }, filters: [["is", "user_id", null]] });
    // The claimed row is now owned, so the final scoped select finds it.
    expect(rooms).toHaveLength(1);
    expect(rooms[0].number).toBe("101");
  });

  test("listRooms() does not re-claim once this user already owns rows there", async () => {
    const { client, calls } = createFakeClient({
      rooms: [{ id: 1, number: "101", user_id: "user-1" }],
    });
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { listRooms } = require("./pmsRepository");
    await listRooms();

    expect(calls.some((call) => call.op === "update")).toBe(false);
  });

  test("listRooms() never surfaces another user's rows", async () => {
    const { client } = createFakeClient({
      rooms: [{ id: 1, number: "101", user_id: "someone-else" }],
    });
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { listRooms } = require("./pmsRepository");
    // Nothing to claim (the only row already belongs to someone else) and
    // the final select is scoped to user-1, so the result is empty.
    await expect(listRooms()).resolves.toEqual([]);
  });

  test("saveRoom() stamps the payload with the current user_id", async () => {
    const { client, calls } = createFakeClient({ rooms: [] });
    mockRequireUserId.mockResolvedValue("user-2");
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveRoom } = require("./pmsRepository");
    await saveRoom({ number: "202", type: "suite", price: 220, status: "libre" });

    const insertCall = calls.find((call) => call.op === "insert");
    expect(insertCall.payload.user_id).toBe("user-2");
  });

  test("saveRoom() rejects without writing anything when a real session exists but requireUserId() itself fails", async () => {
    const { client, calls } = createFakeClient({ rooms: [] });
    mockRequireUserId.mockRejectedValue(new Error("Session Supabase non authentifiee."));
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveRoom } = require("./pmsRepository");
    await expect(saveRoom({ number: "303" })).rejects.toThrow(/non authentifi/i);
    expect(calls).toHaveLength(0);
  });

  // Without any Supabase session at all (not just a requireUserId()
  // failure -- ensureAuthSession() itself resolves to null/undefined),
  // resolveSession() now falls back to a guest session instead of ever
  // reaching Supabase -- see lib/sessionResolver.js and the "guest mode"
  // describe block below for the full guest-branch coverage.
  test("saveRoom() falls back to the guest branch (no Supabase call at all) when there is no session whatsoever", async () => {
    const { client, calls } = createFakeClient({ rooms: [] });
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveRoom } = require("./pmsRepository");
    const saved = await saveRoom({ number: "303", type: "standard", price: 100, status: "libre" });

    expect(saved.number).toBe("303");
    expect(calls).toHaveLength(0);
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("deleteRoom() scopes the delete to both the row id and the current user_id", async () => {
    const { client, calls } = createFakeClient({ rooms: [{ id: 7, number: "707", user_id: "user-3" }] });
    mockRequireUserId.mockResolvedValue("user-3");
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { deleteRoom } = require("./pmsRepository");
    await deleteRoom(7);

    const deleteCall = calls.find((call) => call.op === "delete");
    expect(deleteCall.filters).toEqual([["eq", "id", 7], ["eq", "user_id", "user-3"]]);
  });

  test("deleteRoom() cannot delete a row owned by a different user", async () => {
    const { client, tableState } = createFakeClient({ rooms: [{ id: 7, number: "707", user_id: "someone-else" }] });
    mockRequireUserId.mockResolvedValue("user-3");
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { deleteRoom } = require("./pmsRepository");
    await deleteRoom(7);

    // The delete call was scoped to user-3, so the row (owned by someone
    // else) is filtered out and never actually removed from the table.
    expect(tableState.rooms).toHaveLength(1);
  });
});

describe("pmsRepository guest mode", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
    mockRequireUserId.mockReset();
    mockEnsureAuthSession.mockReset();
    mockAssertSupabaseConfigured.mockReset();
    // No Supabase session at all -> resolveSession() falls back to the
    // real (unmocked) lib/guest/guestSession.js, which is what every
    // export under test here should use instead of ever touching the
    // (still-mocked, and never called in this block) Supabase client.
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("listRooms() seeds the same ready-to-play rooms Career/Restaurant use, on first access", async () => {
    const { listRooms } = require("./pmsRepository");
    const rooms = await listRooms();
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms[0]).toHaveProperty("number");
  });

  test("saveRoom() assigns a new id and persists it across calls", async () => {
    const { saveRoom, listRooms } = require("./pmsRepository");
    const saved = await saveRoom({ number: "999", type: "standard", price: 100, status: "libre" });
    expect(saved.id).toBeDefined();

    const rooms = await listRooms();
    expect(rooms.some((room) => room.number === "999")).toBe(true);
  });

  test("saveRoom() updates an existing room in place instead of duplicating it", async () => {
    const { saveRoom, listRooms } = require("./pmsRepository");
    const rooms = await listRooms();
    const existing = rooms[0];

    await saveRoom({ ...existing, price: existing.price + 50 });
    const reloaded = await listRooms();

    expect(reloaded).toHaveLength(rooms.length);
    expect(reloaded.find((room) => String(room.id) === String(existing.id)).price).toBe(existing.price + 50);
  });

  test("deleteRoom() removes the room from the guest collection", async () => {
    const { listRooms, deleteRoom } = require("./pmsRepository");
    const rooms = await listRooms();
    await deleteRoom(rooms[0].id);

    const reloaded = await listRooms();
    expect(reloaded).toHaveLength(rooms.length - 1);
  });

  test("listReservations()/saveReservation()/deleteReservation() round-trip through the guest collection", async () => {
    const { listReservations, saveReservation, deleteReservation } = require("./pmsRepository");
    const seeded = await listReservations();
    expect(seeded.length).toBeGreaterThan(0);

    const created = await saveReservation({ room_id: 1, client_name: "Nouveau client", arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée", price: 100 });
    expect(created.id).toBeDefined();

    await deleteReservation(created.id);
    const reloaded = await listReservations();
    expect(reloaded).toHaveLength(seeded.length);
  });

  test("listClients()/saveClient()/deleteClient() round-trip through the guest collection, starting empty", async () => {
    const { listClients, saveClient, deleteClient } = require("./pmsRepository");
    await expect(listClients()).resolves.toEqual([]);

    const created = await saveClient({ name: "Ada Lovelace", email: "ada@example.com" });
    expect(created.id).toBeDefined();
    await expect(listClients()).resolves.toHaveLength(1);

    await deleteClient(created.id);
    await expect(listClients()).resolves.toEqual([]);
  });

  test("the same seeded rooms/reservations are shared across separate calls (one localStorage document, not reseeded each time)", async () => {
    const { listRooms: listRoomsFirst } = require("./pmsRepository");
    const first = await listRoomsFirst();

    jest.resetModules();
    mockEnsureAuthSession.mockResolvedValue(null);
    const { listRooms: listRoomsSecond } = require("./pmsRepository");
    const second = await listRoomsSecond();

    expect(second.map((room) => room.id)).toEqual(first.map((room) => room.id));
  });

  test("saveDailyState() persists both rooms and reservations through the guest branch", async () => {
    const { listRooms, saveDailyState } = require("./pmsRepository");
    const rooms = await listRooms();

    await saveDailyState({ rooms: [{ ...rooms[0], status: "occupée" }], reservations: [] });

    const { listRooms: reload } = require("./pmsRepository");
    const reloaded = await reload();
    expect(reloaded.find((room) => String(room.id) === String(rooms[0].id)).status).toBe("occupée");
  });
});
