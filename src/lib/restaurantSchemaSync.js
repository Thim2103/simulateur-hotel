import { assertSupabaseConfigured, supabase } from "./supabase";

const RESTAURANT_ID = "00000000-0000-0000-0000-000000000001";

export const RESTAURANT_SCHEMA = {
  restaurants: { compatibility: "jsonb_on_restaurants", columns: { id: "uuid", name: "text", concept: "text", location: "text", capacity: "integer", opening_hours: "text", structure: "jsonb", marketing: "jsonb", esg: "jsonb", progression: "jsonb" } },
  restaurant_finance: { columns: { restaurant_id: "uuid", day: "date", months: "jsonb", revenue: "numeric[]", costs: "numeric[]", payroll: "numeric", fixed_costs: "numeric", rent: "numeric", taxes: "numeric", energy_cost: "numeric", waste: "numeric" } },
  restaurant_structure: { compatibility: "optional_normalized_table", columns: { restaurant_id: "uuid", concept: "text", location: "text", capacity: "integer", seats: "integer", materials: "text[]", equipment: "text[]", floors: "integer", sections: "text[]", layout: "text", opening_hours: "text" } },
  restaurant_progression: { compatibility: "optional_normalized_table", columns: { restaurant_id: "uuid", xp: "integer", completed_tutorials: "text[]", unlocked_achievements: "text[]", difficulty: "text", cycles: "integer" } },
  restaurant_marketing: { compatibility: "optional_normalized_table", columns: { restaurant_id: "uuid", budget: "numeric", positioning: "text", channels: "jsonb", campaigns: "jsonb", roi: "numeric", visibility: "numeric" } },
  restaurant_esg: { compatibility: "optional_normalized_table", columns: { restaurant_id: "uuid", waste_reduction: "numeric", local_sourcing: "numeric", energy_efficiency: "numeric", staff_wellbeing: "numeric", certifications: "text[]", monthly_investment: "numeric" } },
};

const sqlFor = (table, columns) => `-- Apply through Supabase migrations, not the browser\nalter table public.${table}\n${columns.map(({ name, type }) => `  add column if not exists ${name} ${type};`).join("\n")}`;
const isMissingRelation = (error) => /relation .* does not exist|could not find the table/i.test(error?.message || "");

export async function inspectRestaurantSchema(client = assertSupabaseConfigured()) {
  const tables = {};
  for (const [table, contract] of Object.entries(RESTAURANT_SCHEMA)) {
    const missingColumns = [];
    let tableMissing = false;
    for (const [column, type] of Object.entries(contract.columns)) {
      const { error } = await client.from(table).select(column).limit(0);
      if (error) {
        tableMissing = tableMissing || isMissingRelation(error);
        if (!isMissingRelation(error)) missingColumns.push({ name: column, type });
      }
    }
    const allColumns = Object.entries(contract.columns).map(([name, type]) => ({ name, type }));
    tables[table] = {
      status: tableMissing ? "missing_table" : missingColumns.length ? "missing_columns" : "ok",
      missingColumns: tableMissing ? allColumns : missingColumns,
      compatibility: contract.compatibility || "normalized_table",
      proposedSql: tableMissing || missingColumns.length ? sqlFor(table, tableMissing ? allColumns : missingColumns) : null,
    };
  }
  return { checkedAt: new Date().toISOString(), restaurantId: RESTAURANT_ID, tables };
}

export async function runRestaurantSchemaDiagnostics() {
  if (!supabase) return null;
  const report = await inspectRestaurantSchema(supabase);
  if (Object.values(report.tables).some((table) => table.status !== "ok")) {
    console.warn("[restaurantSchemaSync] Schema drift detected. Apply the proposed SQL through a migration.", report);
  }
  return report;
}

export { RESTAURANT_ID };