// Persistence for the RM Advanced module (see lib/rmAdvanced/,
// supabase/migrations/202609180001_rm_advanced_module.sql). Same shape
// as lib/restaurantAdvancedRepository.js / lib/clientsRepository.js:
// resolveSession() decides Supabase vs guest before anything else runs,
// so a mount-time load can't race ahead of the guest fallback.
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";

const guestRmAdvancedRepository = createGuestRepository("rmAdvanced", { defaultState: null });

export async function getRmAdvancedState() {
  if ((await resolveSession()).mode === "guest") return guestRmAdvancedRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("rm_advanced_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:rm_advanced_state" }
  );
}

export async function saveRmAdvancedState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestRmAdvancedRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("rm_advanced_state").upsert(
    {
      user_id: userId,
      state,
      compression: state?.compression ?? {},
      displacement: state?.displacement ?? {},
      pickup_curves: state?.pickupCurves ?? {},
      forecast: state?.forecast ?? {},
      ota_share: state?.otaStrategy?.otaShare ?? null,
      direct_share: state?.otaStrategy?.directShare ?? null,
      diagnostics: state?.diagnostics ?? [],
      metadata: {
        period: state?.period ?? null,
        cyclesElapsed: state?.cyclesElapsed ?? 0,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveRmAdvancedForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into rm_advanced_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("rm_advanced_forecast").upsert(
    {
      user_id: userId,
      forecast,
      metadata: { generatedAt: forecast?.generatedAt ?? null },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// Persists the RM Advanced diagnostics on their own row (in addition to
// being folded into rm_advanced_state's own `diagnostics` column) --
// requested as a dedicated table so a future diagnostics-history view
// can query it without loading the full state blob each time.
export async function saveRmAdvancedDiagnostics(diagnostics) {
  if ((await resolveSession()).mode === "guest") return; // folded into rm_advanced_state's own `diagnostics` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("rm_advanced_diagnostics").upsert(
    {
      user_id: userId,
      diagnostics,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export const rmAdvancedRepository = {
  getRmAdvancedState,
  saveRmAdvancedState,
  saveRmAdvancedForecast,
  saveRmAdvancedDiagnostics,
};
export default rmAdvancedRepository;
