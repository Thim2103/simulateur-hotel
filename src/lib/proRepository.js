// Persistence for the Professional Solo mode (see lib/pro/, supabase/
// migrations/202609190001_pro_module.sql). Same shape as
// lib/tfeRepository.js: resolveSession() decides Supabase vs guest
// before anything else runs, so a mount-time load can't race ahead of
// the guest fallback (see useCareer.js's docstring for the race this
// pattern avoids).
//
// A Pro run is entirely self-contained (see lib/pro/proState.js's own
// header comment: it embeds its own CareerState rather than sharing the
// player's regular Solo/Carrière save), so pro_state alone is enough to
// resume a run -- pro_report/pro_score/pro_forecast/pro_diagnostics are
// normalized, queryable copies of what's already inside it (same "one
// table per module concept" convention every other module's migration
// already establishes).
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";

const guestProRepository = createGuestRepository("pro", { defaultState: null });

export async function getProState() {
  if ((await resolveSession()).mode === "guest") return guestProRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("pro_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:pro_state" }
  );
}

export async function saveProState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestProRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("pro_state").upsert(
    {
      user_id: userId,
      state,
      hotel_config: state?.hotelConfig ?? {},
      scenario: { phases: state?.phases ?? [] },
      crises: state?.crises ?? [],
      opportunities: state?.opportunities ?? [],
      audits: state?.audits ?? [],
      objectives: state?.objectives ?? [],
      missions: state?.missions ?? [],
      performance: state?.performanceHistory ?? [],
      score: state?.score ?? {},
      forecast: state?.forecast ?? {},
      diagnostics: state?.diagnostics ?? [],
      report: state?.report ?? {},
      metadata: { status: state?.status ?? "not_started", month: state?.month ?? 0, horizonMonths: state?.horizonMonths ?? 24 },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// The final Pro report, once the run reaches its horizon -- "rapport
// final professionnel" -- as its own row so it can be listed/queried
// without pulling the full pro_state.state jsonb blob.
export async function saveProReport(report) {
  if ((await resolveSession()).mode === "guest") return; // folded into pro_state's own `report` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("pro_report").upsert(
    { user_id: userId, report, metadata: { generatedAt: report?.generatedAt ?? null, grade: report?.grade ?? null }, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveProScore(score) {
  if ((await resolveSession()).mode === "guest") return; // folded into pro_state's own `score` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("pro_score").upsert(
    { user_id: userId, score, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveProForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into pro_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("pro_forecast").upsert(
    { user_id: userId, forecast, metadata: { generatedAt: forecast?.generatedAt ?? null }, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveProDiagnostics(diagnostics) {
  if ((await resolveSession()).mode === "guest") return; // folded into pro_state's own `diagnostics` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("pro_diagnostics").upsert(
    { user_id: userId, diagnostics, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export const proRepository = { getProState, saveProState, saveProReport, saveProScore, saveProForecast, saveProDiagnostics };
export default proRepository;
