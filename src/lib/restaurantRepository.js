import { assertSupabaseConfigured } from "./supabase";

const RESTAURANT_ID = "00000000-0000-0000-0000-000000000001";

function required(value, field) {
  if (value === undefined || value === null || value === "") throw new Error(`${field} est obligatoire.`);
}

function validateItem(item, fields) {
  fields.forEach((field) => required(item[field], field));
  return item;
}

function toStaffRow(person) {
  return { id: person.id, restaurant_id: RESTAURANT_ID, name: person.name, role: person.role, department: person.department, salary: Number(person.salary) || 0, skills: person.skills || [] };
}

function toMenuRow(item) {
  return { id: item.id, restaurant_id: RESTAURANT_ID, name: item.name, category: item.category, cost: Number(item.cost) || 0, price: Number(item.price) || 0, sales: Number(item.sales) || 0 };
}

function toOperationRow(operation) {
  return { id: operation.id, restaurant_id: RESTAURANT_ID, title: operation.title, type: operation.type, status: operation.status, owner: operation.owner, priority: operation.priority, due_in: operation.dueIn };
}

function fromOperationRow(operation) {
  return { ...operation, dueIn: operation.due_in };
}

async function select(table, query = (builder) => builder) {
  const client = assertSupabaseConfigured();
  const { data, error } = await query(client.from(table).select("*"));
  if (error) throw error;
  return data || [];
}

async function upsert(table, rows) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from(table).upsert(rows).select();
  if (error) throw error;
  return data || [];
}

async function remove(table, id, idColumn = "id") {
  const client = assertSupabaseConfigured();
  const query = client.from(table).delete().eq(idColumn, id);
  const { error } = await (idColumn === "restaurant_id" ? query : query.eq("restaurant_id", RESTAURANT_ID));
  if (error) throw error;
}

export async function getRestaurantState() {
  const [profiles, finances, staff, menu, operations] = await Promise.all([
    select("restaurants", (builder) => builder.eq("id", RESTAURANT_ID).limit(1)),
    select("restaurant_finance", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).limit(1)),
    select("restaurant_staff", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("created_at")),
    select("restaurant_menu_items", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("created_at")),
    select("restaurant_operations", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("created_at")),
  ]);
  const profile = profiles[0];
  const finance = finances[0];
  if (!profile || !finance) throw new Error("Le restaurant n'est pas initialise. Executez la migration Supabase.");
  return {
    structure: profile.structure,
    finance: { months: finance.months, revenue: finance.revenue, costs: finance.costs, payroll: finance.payroll, fixedCosts: finance.fixed_costs, rent: finance.rent, taxes: finance.taxes },
    staff,
    menu,
    operations: operations.map(fromOperationRow),
    marketing: profile.marketing,
    esg: profile.esg,
    expansion: profile.expansion,
    progression: profile.progression,
  };
}

export async function saveRestaurantState(state) {
  const client = assertSupabaseConfigured();
  await upsert("restaurants", [{ id: RESTAURANT_ID, structure: state.structure, marketing: state.marketing, esg: state.esg, expansion: state.expansion, progression: state.progression }]);
  await upsert("restaurant_finance", [{ restaurant_id: RESTAURANT_ID, months: state.finance.months, revenue: state.finance.revenue, costs: state.finance.costs, payroll: state.finance.payroll, fixed_costs: state.finance.fixedCosts, rent: state.finance.rent, taxes: state.finance.taxes }]);
  const existing = await Promise.all([
    select("restaurant_staff", (builder) => builder.eq("restaurant_id", RESTAURANT_ID)),
    select("restaurant_menu_items", (builder) => builder.eq("restaurant_id", RESTAURANT_ID)),
    select("restaurant_operations", (builder) => builder.eq("restaurant_id", RESTAURANT_ID)),
  ]);
  const currentIds = [state.staff, state.menu, state.operations].map((items) => new Set(items.map((item) => String(item.id))));
  await Promise.all(existing.map((rows, index) => Promise.all(rows.filter((row) => !currentIds[index].has(String(row.id))).map((row) => client.from(["restaurant_staff", "restaurant_menu_items", "restaurant_operations"][index]).delete().eq("id", row.id).eq("restaurant_id", RESTAURANT_ID)))));
  await Promise.all([
    upsert("restaurant_staff", state.staff.map(toStaffRow)),
    upsert("restaurant_menu_items", state.menu.map(toMenuRow)),
    upsert("restaurant_operations", state.operations.map(toOperationRow)),
  ]);
}

export const restaurantRepository = {
  restaurant: {
    get: () => select("restaurants", (builder) => builder.eq("id", RESTAURANT_ID).limit(1)),
    upsert: (restaurant) => upsert("restaurants", [{ ...restaurant, id: RESTAURANT_ID }]),
    remove: () => remove("restaurants", RESTAURANT_ID),
  },
  getRestaurantState,
  saveRestaurantState,
  staff: {
    list: () => select("restaurant_staff", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("created_at")),
    upsert: (person) => upsert("restaurant_staff", [toStaffRow(validateItem(person, ["name", "role", "department"]))]),
    remove: (id) => remove("restaurant_staff", id),
  },
  menu: {
    list: () => select("restaurant_menu_items", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("created_at")),
    upsert: (item) => upsert("restaurant_menu_items", [toMenuRow(validateItem(item, ["name", "category"]))]),
    remove: (id) => remove("restaurant_menu_items", id),
  },
  operations: {
    list: () => select("restaurant_operations", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("created_at")).then((rows) => rows.map(fromOperationRow)),
    upsert: (operation) => upsert("restaurant_operations", [toOperationRow(validateItem(operation, ["title", "type", "status"]))]),
    remove: (id) => remove("restaurant_operations", id),
  },
  finance: {
    get: () => select("restaurant_finance", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).limit(1)),
    update: (finance) => upsert("restaurant_finance", [{ restaurant_id: RESTAURANT_ID, months: finance.months, revenue: finance.revenue, costs: finance.costs, payroll: finance.payroll, fixed_costs: finance.fixedCosts, rent: finance.rent, taxes: finance.taxes }]).then((rows) => rows[0]),
    remove: () => remove("restaurant_finance", RESTAURANT_ID, "restaurant_id"),
  },
};

export async function listReservations() {
  return select("reservations", (builder) => builder.order("arrival"));
}

export async function createReservation(input) {
  validateItem(input, ["client_name", "room", "arrival", "departure", "status"]);
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from("reservations").insert({ ...input, client: input.client_name, client_name: input.client_name }).select().single();
  if (error) throw error;
  return data;
}

export async function updateReservation(id, input) {
  validateItem(input, ["client_name", "room", "arrival", "departure", "status"]);
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from("reservations").update({ ...input, client: input.client_name, client_name: input.client_name }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteReservation(id) {
  const client = assertSupabaseConfigured();
  const { error } = await client.from("reservations").delete().eq("id", id);
  if (error) throw error;
}