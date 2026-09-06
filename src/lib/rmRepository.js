import { assertSupabaseConfigured } from "./supabase";

async function list(table, configure) {
  const client = assertSupabaseConfigured();
  let query = client.from(table).select("*");
  if (configure) query = configure(query);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getRMData() {
  const [rooms, reservations, forecasts, kpis] = await Promise.all([
    list("rooms"),
    list("reservations", (query) => query.order("arrival")),
    list("rm_forecasts", (query) => query.order("forecast_date")),
    list("rm_kpis", (query) => query.order("period_start")),
  ]);

  return { rooms, reservations, forecasts, kpis };
}

export async function listRMForecasts() {
  return list("rm_forecasts", (query) => query.order("forecast_date"));
}

export async function listRMKpis() {
  return list("rm_kpis", (query) => query.order("period_start"));
}

export const rmRepository = { getRMData, listRMForecasts, listRMKpis };