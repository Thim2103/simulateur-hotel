// Persistence for the Housekeeping module (see lib/housekeeping/,
// supabase/migrations/202609140001_housekeeping_module.sql). Same shape
// as lib/financeRepository.js/lib/staffRepository.js/
// lib/marketingRepository.js/lib/esgRepository.js: resolveSession()
// decides Supabase vs guest before anything else runs, so a mount-time
// load can't race ahead of the guest fallback (see useCareer.js's
// docstring for the race this pattern avoids).
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";

const guestHousekeepingRepository = createGuestRepository("housekeeping", { defaultState: null });

export async function getHousekeepingState() {
  if ((await resolveSession()).mode === "guest") return guestHousekeepingRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("housekeeping_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:housekeeping_state" }
  );
}

export async function saveHousekeepingState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestHousekeepingRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("housekeeping_state").upsert(
    {
      user_id: userId,
      state,
      workload: state?.workload ?? {},
      productivity: state?.productivity ?? 0,
      cleaning_time: state?.cleaningTime ?? {},
      overload: state?.overload ?? 0,
      understaffing: state?.understaffing ?? {},
      quality: state?.quality ?? 0,
      forecast: state?.forecast ?? {},
      diagnostics: state?.diagnostics ?? [],
      metadata: { period: state?.period ?? null, cyclesElapsed: state?.cyclesElapsed ?? 0, housekeeperCount: state?.housekeeperCount ?? 0, cost: state?.cost ?? 0 },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveHousekeepingForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into housekeeping_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("housekeeping_forecast").upsert(
    { user_id: userId, forecast, metadata: { generatedAt: forecast?.generatedAt ?? null }, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export const housekeepingRepository = { getHousekeepingState, saveHousekeepingState, saveHousekeepingForecast };
export default housekeepingRepository;
