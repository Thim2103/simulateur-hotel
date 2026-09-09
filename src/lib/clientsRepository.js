// Persistence for the Clients module (see lib/clients/,
// supabase/migrations/202609160001_clients_module.sql). Same shape as
// lib/housekeepingRepository.js / lib/esgRepository.js: resolveSession()
// decides Supabase vs guest before anything else runs, so a mount-time
// load can't race ahead of the guest fallback.
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";

const guestClientsRepository = createGuestRepository("clients", { defaultState: null });

export async function getClientsState() {
  if ((await resolveSession()).mode === "guest") return guestClientsRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("clients_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:clients_state" }
  );
}

export async function saveClientsState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestClientsRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("clients_state").upsert(
    {
      user_id: userId,
      state,
      satisfaction: state?.satisfaction ?? null,
      loyalty: state?.loyalty ?? null,
      segments: state?.segments ?? {},
      reviews: state?.reviews ?? {},
      complaints: state?.complaints ?? [],
      forecast: state?.forecast ?? {},
      diagnostics: state?.diagnostics ?? [],
      metadata: {
        period: state?.period ?? null,
        cyclesElapsed: state?.cyclesElapsed ?? 0,
        preferredSegment: state?.behaviors?.preferredSegment ?? null,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveClientsForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into clients_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("clients_forecast").upsert(
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

export const clientsRepository = { getClientsState, saveClientsState, saveClientsForecast };
export default clientsRepository;
