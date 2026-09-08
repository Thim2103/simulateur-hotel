// Persistence for the TFE Solo mode (see lib/tfe/, supabase/migrations/
// 202609150001_tfe_module.sql). Same shape as lib/financeRepository.js/
// lib/staffRepository.js/lib/marketingRepository.js/lib/esgRepository.js
// /lib/housekeepingRepository.js: resolveSession() decides Supabase vs
// guest before anything else runs, so a mount-time load can't race ahead
// of the guest fallback (see useCareer.js's docstring for the race this
// pattern avoids).
//
// A TFE run is entirely self-contained (see lib/tfe/tfeState.js's own
// header comment: it embeds its own CareerState rather than sharing the
// player's regular Solo/Carrière save), so tfe_state alone is enough to
// resume a run -- tfe_report/tfe_score/tfe_forecast are normalized,
// queryable copies of what's already inside it (same "one table per
// module concept" convention every other module's migration already
// establishes).
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";

const guestTfeRepository = createGuestRepository("tfe", { defaultState: null });

export async function getTfeState() {
  if ((await resolveSession()).mode === "guest") return guestTfeRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("tfe_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:tfe_state" }
  );
}

export async function saveTfeState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestTfeRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("tfe_state").upsert(
    {
      user_id: userId,
      state,
      hotel_config: state?.hotelConfig ?? {},
      storyline: { chapters: state?.chapters ?? [], missions: state?.missions ?? [], objectives: state?.objectives ?? [] },
      performance: state?.performanceHistory ?? [],
      score: state?.score ?? {},
      forecast: state?.forecast ?? {},
      diagnostics: state?.diagnostics ?? [],
      report: state?.report ?? {},
      metadata: { status: state?.status ?? "not_started", month: state?.month ?? 0, horizonMonths: state?.horizonMonths ?? 36 },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// The final TFE report, once the run reaches month 36 -- "rapport final
// TFE" (section 1) -- as its own row so it can be listed/queried without
// pulling the full tfe_state.state jsonb blob.
export async function saveTfeReport(report) {
  if ((await resolveSession()).mode === "guest") return; // folded into tfe_state's own `report` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("tfe_report").upsert(
    { user_id: userId, report, metadata: { generatedAt: report?.generatedAt ?? null, grade: report?.grade ?? null }, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveTfeScore(score) {
  if ((await resolveSession()).mode === "guest") return; // folded into tfe_state's own `score` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("tfe_score").upsert(
    { user_id: userId, score, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveTfeForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into tfe_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("tfe_forecast").upsert(
    { user_id: userId, forecast, metadata: { generatedAt: forecast?.generatedAt ?? null }, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export const tfeRepository = { getTfeState, saveTfeState, saveTfeReport, saveTfeScore, saveTfeForecast };
export default tfeRepository;
