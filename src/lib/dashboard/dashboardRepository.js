// Persistence for the Dashboard's own preferences (see
// supabase/migrations/202609090001_dashboard_module.sql): a single
// dashboard_state row per user holding the view-mode choice and a light
// metadata bag (see dashboardState.js's serializeDashboardPreferences()).
// The KPIs/notifications/insights/quickActions/replaySummary/
// careerSummary are all recomputed from CareerState on every load (see
// dashboardEngine.js's buildDashboardState()) and are not stored here --
// storing a derived snapshot would just go stale the moment the player
// plays another day.
import { assertSupabaseConfigured, requireUserId } from "../supabase";
import { safeLoad } from "../safeLoad";
import { deserializeDashboardPreferences, serializeDashboardPreferences } from "./dashboardState";

export async function saveDashboardPreferences(state) {
  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const serialized = serializeDashboardPreferences(state);

  const { error } = await client.from("dashboard_state").upsert(
    {
      user_id: userId,
      kpis: {},
      notifications: {},
      insights: {},
      quick_actions: [],
      view_mode: serialized.viewMode,
      metadata: serialized.metadata,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function loadDashboardPreferences() {
  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("dashboard_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return null;

      return deserializeDashboardPreferences({ viewMode: row.view_mode, metadata: row.metadata });
    },
    null,
    { label: "select:dashboard_state" }
  );
}

export const dashboardRepository = { saveDashboardPreferences, loadDashboardPreferences };
export default dashboardRepository;
