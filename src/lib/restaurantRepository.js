import { assertSupabaseConfigured } from "./supabase";
import { safeLoad } from "./safeLoad";
import { safeArray, safeNumber, safeObject } from "./safe";

const RESTAURANT_ID = "00000000-0000-0000-0000-000000000001";
const FINANCE_MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const FINANCE_MONTH_ALIASES = {
  jan: "jan", january: "jan", janvier: "jan",
  feb: "feb", february: "feb", fevrier: "feb", février: "feb",
  mar: "mar", march: "mar", mars: "mar",
  apr: "apr", april: "apr", avril: "apr",
  may: "may", mai: "may",
  jun: "jun", june: "jun", juin: "jun",
  jul: "jul", july: "jul", juillet: "jul",
  aug: "aug", august: "aug", aout: "aug", août: "aug",
  sep: "sep", september: "sep", septembre: "sep",
  oct: "oct", october: "oct", octobre: "oct",
  nov: "nov", november: "nov", novembre: "nov",
  dec: "dec", december: "dec", decembre: "dec", décembre: "dec",
};

function numericMonthValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeMonths(months) {
  const normalized = Object.fromEntries(FINANCE_MONTH_KEYS.map((key) => [key, 0]));

  if (Array.isArray(months)) {
    months.slice(0, FINANCE_MONTH_KEYS.length).forEach((value, index) => {
      normalized[FINANCE_MONTH_KEYS[index]] = numericMonthValue(value);
    });
    return normalized;
  }

  if (months && typeof months === "object") {
    Object.entries(months).forEach(([key, value]) => {
      const monthKey = FINANCE_MONTH_ALIASES[key.toLowerCase()];
      if (monthKey) normalized[monthKey] = numericMonthValue(value);
    });
  }

  return normalized;
}

export const normalizeFinanceMonths = normalizeMonths;

// restaurant_finance.taxes is stored as a scalar `numeric` column, but legacy
// rows/state (or a future per-month schema) may carry it as an array. Accept
// either shape defensively and never let a non-numeric value slip through.
export function normalizeTaxes(value, fallback = 0) {
  if (Array.isArray(value)) return value.map((item) => safeNumber(item, 0));
  if (typeof value === "string" && value.trim().startsWith("[")) {
    return safeArray(value, []).map((item) => safeNumber(item, 0));
  }
  return safeNumber(value, fallback);
}

// The DB column only accepts a scalar: collapse an array-shaped tax rate
// (legacy data, or a value that only went through normalizeTaxes) to its
// most recent entry before writing it back to Supabase.
function toTaxesColumnValue(value, fallback = 0) {
  const normalized = normalizeTaxes(value, fallback);
  return Array.isArray(normalized) ? safeNumber(normalized[normalized.length - 1], fallback) : normalized;
}

const FINANCE_DEFAULTS = {
  day: null,
  months: normalizeMonths(null),
  revenue: [],
  costs: [],
  taxes: 0,
  waste: [],
  energy: [],
  energyCost: [],
  payroll: 0,
  fixedCosts: 0,
  rent: 0,
};

export const defaultStructure = {
  floors: 1,
  sections: ["main"],
  capacity: 40,
  layout: "standard",
};

export const defaultRestaurant = {
  id: RESTAURANT_ID,
  name: "Luxury Palace",
  concept: "Fusion créative",
  location: "Bruxelles",
  capacity: 40,
  opening_hours: "12:00-14:30, 18:00-22:00",
  esg: { energy: 0, water: 0, waste: 0, co2: 0 },
  expansion: { rooms: 0, staff: 0, revenue: 0, progress: 0 },
  marketing: { budget: 0, roi: 0, campaigns: 0, visibility: 0 },
  progression: { level: 1, xp: 0, next_level_xp: 100, milestones: [] },
  structure: defaultStructure,
};

export const safeRestaurant = (restaurant) => restaurant ?? defaultRestaurant;

function restaurantPayload(restaurant = {}) {
  const source = safeRestaurant(restaurant);
  return {
    ...defaultRestaurant,
    ...source,
    id: RESTAURANT_ID,
    name: source.name || defaultRestaurant.name,
    concept: source.concept || defaultRestaurant.concept,
    location: source.location || defaultRestaurant.location,
    capacity: Number(source.capacity || defaultRestaurant.capacity),
    opening_hours: source.opening_hours || source.openingHours || defaultRestaurant.opening_hours,
    structure: { ...defaultStructure, ...(source.structure || {}) },
    esg: { ...defaultRestaurant.esg, ...(source.esg || {}) },
    expansion: { ...defaultRestaurant.expansion, ...(source.expansion || {}) },
    marketing: { ...defaultRestaurant.marketing, ...(source.marketing || {}) },
    progression: { ...defaultRestaurant.progression, ...(source.progression || {}) },
  };
}

function required(value, field) {
  if (value === undefined || value === null || value === "") throw new Error(`${field} est obligatoire.`);
}

function validateItem(item, fields) {
  fields.forEach((field) => required(item[field], field));
  return item;
}

function toStaffRow(person) {
  return { id: person.id, restaurant_id: RESTAURANT_ID, name: person.name, role: person.role, department: person.department, salary: Number(person.salary) || 0, skills: person.skills || [], skill_level: Number(person.skill_level || person.skillLevel || 0), productivity: Number(person.productivity || 0), satisfaction: Number(person.satisfaction || 0), experience_years: Number(person.experience_years || person.experienceYears || 0) };
}

function toMenuRow(item) {
  return { id: item.id, restaurant_id: RESTAURANT_ID, name: item.name, category: item.category, cost: Number(item.cost) || 0, price: Number(item.price) || 0, sales: Number(item.sales) || 0, popularity: Number(item.popularity || 0), preparation_time: Number(item.preparation_time || item.preparationTime || 0) };
}

function toOperationRow(operation) {
  return { id: operation.id, restaurant_id: RESTAURANT_ID, day: operation.day, title: operation.title, type: operation.type, status: operation.status, owner: operation.owner, priority: operation.priority, due_in: operation.dueIn, customers_served: Number(operation.customers_served || operation.customersServed || 0), average_wait_time: Number(operation.average_wait_time || operation.averageWaitTime || 0), service_quality: Number(operation.service_quality || operation.serviceQuality || 0), kitchen_efficiency: Number(operation.kitchen_efficiency || operation.kitchenEfficiency || 0), incidents: Number(operation.incidents || 0), complaints: Number(operation.complaints || 0), compliments: Number(operation.compliments || 0) };
}

function fromOperationRow(operation) {
  return { ...operation, dueIn: operation.due_in, customersServed: operation.customers_served, averageWaitTime: operation.average_wait_time, serviceQuality: operation.service_quality, kitchenEfficiency: operation.kitchen_efficiency };
}

function toNumberArray(rows, field) {
  return safeArray(rows, []).flatMap((row) => {
    const value = safeObject(row)[field];
    return safeArray(value, [value]);
  }).map((value) => safeNumber(value, 0));
}

// Shapes whatever restaurant_finance row(s) Supabase returned into the
// finance contract the app expects, defaulting every field individually so a
// null row, a missing column, or an unexpected type never breaks the shape.
export function buildFinanceState(financeRows) {
  const rows = safeArray(financeRows, []);
  const finance = safeObject(rows[0]);
  return {
    day: finance.day ?? FINANCE_DEFAULTS.day,
    months: normalizeMonths(finance.months),
    revenue: toNumberArray(rows, "revenue"),
    costs: toNumberArray(rows, "costs"),
    taxes: normalizeTaxes(finance.taxes, FINANCE_DEFAULTS.taxes),
    waste: toNumberArray(rows, "waste"),
    energy: toNumberArray(rows, "energy_cost"),
    energyCost: toNumberArray(rows, "energy_cost"),
    payroll: safeNumber(finance.payroll, FINANCE_DEFAULTS.payroll),
    fixedCosts: safeNumber(finance.fixed_costs, FINANCE_DEFAULTS.fixedCosts),
    rent: safeNumber(finance.rent, FINANCE_DEFAULTS.rent),
  };
}

// Dedicated, resilient Finance loader: the underlying select() already
// swallows its own errors, but this also guards buildFinanceState() itself
// and guarantees a fully-shaped, normalized finance object comes back no
// matter what Supabase returns (null rows, missing table, malformed types).
async function loadRestaurantFinance() {
  return safeLoad(
    async () => buildFinanceState(await select("restaurant_finance", (builder) => builder.eq("restaurant_id", RESTAURANT_ID))),
    { ...FINANCE_DEFAULTS },
    { label: "select:restaurant_finance" }
  );
}

async function select(table, query = (builder) => builder) {
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await query(client.from(table).select("*"));
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    [],
    { label: `select:${table}` }
  );
}

async function upsert(table, rows) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from(table).upsert(rows).select();
  if (error) throw error;
  return data || [];
}

async function insertRestaurant(restaurant) {
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("restaurants").insert(restaurant).select("*");
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    defaultRestaurant,
    { label: "insertRestaurant" }
  );
}

async function remove(table, id, idColumn = "id") {
  const client = assertSupabaseConfigured();
  const query = client.from(table).delete().eq(idColumn, id);
  const { error } = await (idColumn === "restaurant_id" ? query : query.eq("restaurant_id", RESTAURANT_ID));
  if (error) throw error;
}

export async function getRestaurantState() {
  const [profilesData, financeState, staffData, menuData, operationsData] = await Promise.all([
    select("restaurants", (builder) => builder.eq("id", RESTAURANT_ID).limit(1)),
    loadRestaurantFinance(),
    select("restaurant_staff", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("created_at")),
    select("restaurant_menu_items", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("created_at")),
    select("restaurant_operations", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("created_at")),
  ]);
  const profiles = safeArray(profilesData, []);
  const staff = safeArray(staffData, []);
  const menu = safeArray(menuData, []);
  const operations = safeArray(operationsData, []);
  let profile = profiles[0];
  if (!profile) profile = await insertRestaurant(defaultRestaurant);
  profile = safeObject(safeRestaurant(profile));
  const structure = safeObject(profile.structure);
  return {
    structure: { ...defaultStructure, ...structure, concept: profile.concept || structure.concept, location: profile.location || structure.location, capacity: profile.capacity || structure.capacity, openingHours: profile.opening_hours || structure.openingHours },
    finance: financeState,
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
  const restaurantUpdate = {
    name: state.structure?.name || defaultRestaurant.name,
    concept: state.structure?.concept || defaultRestaurant.concept,
    location: state.structure?.location || defaultRestaurant.location,
    capacity: Number(state.structure?.capacity || defaultRestaurant.capacity),
    opening_hours: state.structure?.openingHours || defaultRestaurant.opening_hours,
    structure: { ...defaultStructure, ...(state.structure || {}) },
    marketing: state.marketing || defaultRestaurant.marketing,
    esg: state.esg || defaultRestaurant.esg,
    expansion: state.expansion || defaultRestaurant.expansion,
    progression: state.progression || defaultRestaurant.progression,
  };
  const { error: restaurantError } = await client.from("restaurants").update(restaurantUpdate).eq("id", RESTAURANT_ID);
  if (restaurantError) throw restaurantError;
  const finance = safeObject(state.finance);
  await upsert("restaurant_finance", [{ restaurant_id: RESTAURANT_ID, day: finance.day, months: normalizeMonths(finance.months), revenue: finance.revenue, costs: finance.costs, payroll: finance.payroll, fixed_costs: finance.fixedCosts, rent: finance.rent, taxes: toTaxesColumnValue(finance.taxes), energy_cost: finance.energyCost, waste: finance.waste }]);
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
    upsert: (restaurant) => upsert("restaurants", [restaurantPayload(restaurant)]),
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
    get: () => select("restaurant_finance", (builder) => builder.eq("restaurant_id", RESTAURANT_ID)),
    update: (finance) => {
      const source = safeObject(finance);
      return upsert("restaurant_finance", [{ restaurant_id: RESTAURANT_ID, months: normalizeMonths(source.months), revenue: source.revenue, costs: source.costs, payroll: source.payroll, fixed_costs: source.fixedCosts, rent: source.rent, taxes: toTaxesColumnValue(source.taxes) }]).then((rows) => rows[0]);
    },
    remove: () => remove("restaurant_finance", RESTAURANT_ID, "restaurant_id"),
  },
  financeHistory: {
    list: () => select("restaurant_finance_periods", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("period_start")),
  },
  esg: {
    list: () => select("restaurant_esg_metrics", (builder) => builder.eq("restaurant_id", RESTAURANT_ID).order("period_start")),
  },
};

export async function listReservations() {
  return select("reservations", (builder) => builder.order("arrival"));
}

function toReservationRow(input) {
  const clientName = input.client_name ?? input.client;
  const roomId = input.room_id ?? input.roomId;
  const room = input.room ?? (roomId === undefined || roomId === null ? undefined : String(roomId));
  required(clientName, "client_name");
  required(roomId ?? room, "room");
  validateItem(input, ["arrival", "departure", "status"]);
  return {
    ...input,
    client_name: clientName,
    client: clientName,
    ...(roomId === undefined || roomId === null ? {} : { room_id: Number(roomId) }),
    ...(room === undefined ? {} : { room }),
  };
}

export async function createReservation(input) {
  const reservation = toReservationRow(input);
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from("reservations").insert(reservation).select().single();
  if (error) throw error;
  return data;
}

export async function updateReservation(id, input) {
  const reservation = toReservationRow(input);
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from("reservations").update(reservation).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteReservation(id) {
  const client = assertSupabaseConfigured();
  const { error } = await client.from("reservations").delete().eq("id", id);
  if (error) throw error;
}