// Persistence for the Staff module (see lib/staff/, supabase/migrations/
// 202609110001_staff_module.sql). Same shape as lib/financeRepository.js:
// resolveSession() decides Supabase vs guest before anything else runs,
// so a mount-time load can't race ahead of the guest fallback (see
// useCareer.js's docstring for the race this pattern avoids).
//
// Not to be confused with lib/staffMulti/ (multi-site chain HR, its own
// in-memory-only useStaff.js hook driving the /chain/staff page) -- this
// repository is for the Career/Guest-Mode Staff module (see
// hooks/useStaffEngine.js, pages/StaffDashboard.jsx).
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";

const guestStaffRepository = createGuestRepository("staff", { defaultState: null });

export async function getStaffState() {
  if ((await resolveSession()).mode === "guest") return guestStaffRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("staff_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:staff_state" }
  );
}

export async function saveStaffState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestStaffRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("staff_state").upsert(
    {
      user_id: userId,
      state,
      moral: state?.morale ?? 0,
      productivity: state?.productivity ?? 0,
      absenteeism: state?.absenteeism ?? 0,
      overload: state?.overload ?? 0,
      turnover: state?.turnover ?? {},
      payroll: state?.payroll ?? {},
      diagnostics: state?.diagnostics ?? [],
      forecast: state?.forecast ?? {},
      metadata: { period: state?.period ?? null, cyclesElapsed: state?.cyclesElapsed ?? 0, headcount: state?.headcount ?? {} },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function saveStaffForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into staff_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("staff_forecast").upsert(
    { user_id: userId, forecast, metadata: { generatedAt: forecast?.generatedAt ?? null }, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export const staffRepository = { getStaffState, saveStaffState, saveStaffForecast };
export default staffRepository;
