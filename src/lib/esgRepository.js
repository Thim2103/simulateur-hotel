// Persistence for the ESG module (see lib/esg/, supabase/migrations/
// 202609130001_esg_module.sql). Same shape as lib/financeRepository.js/
// lib/staffRepository.js/lib/marketingRepository.js: resolveSession()
// decides Supabase vs guest before anything else runs, so a mount-time
// load can't race ahead of the guest fallback (see useCareer.js's
// docstring for the race this pattern avoids).
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";
import { safeArray } from "./safe";

const guestEsgRepository = createGuestRepository("esg", { defaultState: null });

export async function getEsgState() {
  if ((await resolveSession()).mode === "guest") return guestEsgRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("esg_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:esg_state" }
  );
}

export async function saveEsgState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestEsgRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("esg_state").upsert(
    {
      user_id: userId,
      state,
      energy: state?.energy ?? 0,
      water: state?.water ?? 0,
      waste: state?.waste ?? 0,
      co2: state?.co2 ?? 0,
      score: state?.score ?? 0,
      certifications: state?.certifications ?? [],
      forecast: state?.forecast ?? {},
      diagnostics: state?.diagnostics ?? [],
      metadata: { period: state?.period ?? null, cyclesElapsed: state?.cyclesElapsed ?? 0, costs: state?.costs ?? {} },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveEsgForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into esg_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("esg_forecast").upsert(
    { user_id: userId, forecast, metadata: { generatedAt: forecast?.generatedAt ?? null }, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// One row per certification obtained -- "tables ... esg_certifications"
// (section 6). A guest keeps every certification inside
// esg_state.state.certifications (already covered), same convention as
// lib/financeRepository.js/lib/staffRepository.js/
// lib/marketingRepository.js's own per-table guest no-ops.
export async function saveEsgCertifications(certifications) {
  if ((await resolveSession()).mode === "guest") return;

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const obtained = safeArray(certifications).filter((certification) => certification.obtained);
  if (!obtained.length) return;
  const rows = obtained.map((certification) => ({
    user_id: userId,
    certification_id: String(certification.id),
    name: certification.name ?? "",
    obtained_at: new Date().toISOString(),
    metadata: { progress: certification.progress ?? 0 },
    updated_at: new Date().toISOString(),
  }));
  const { error } = await client.from("esg_certifications").upsert(rows, { onConflict: "user_id,certification_id" });
  if (error) throw error;
}

export const esgRepository = { getEsgState, saveEsgState, saveEsgForecast, saveEsgCertifications };
export default esgRepository;
