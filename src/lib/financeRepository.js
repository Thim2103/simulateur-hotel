// Persistence for the Finance module (see lib/finance/, supabase/
// migrations/202609100001_finance_module.sql). Same shape as
// hotelRepository.js/restaurantRepository.js: resolveSession() decides
// Supabase vs guest before anything else runs, so a mount-time load
// can't race ahead of the guest fallback (see useCareer.js's docstring
// for the race this pattern avoids).
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";

const guestFinanceRepository = createGuestRepository("finance", { defaultState: null });

export async function getFinanceState() {
  if ((await resolveSession()).mode === "guest") return guestFinanceRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("finance_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:finance_state" }
  );
}

export async function saveFinanceState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestFinanceRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("finance_state").upsert(
    {
      user_id: userId,
      state,
      revenues: state?.incomeStatement?.revenues ?? {},
      expenses: state?.incomeStatement?.expenses ?? {},
      gop: state?.incomeStatement?.gop ?? 0,
      ebitda: state?.incomeStatement?.ebitda ?? 0,
      cashflow: state?.cashFlow ?? {},
      ratios: state?.ratios ?? {},
      forecast: state?.forecast ?? {},
      diagnostics: state?.diagnostics ?? [],
      metadata: { period: state?.period ?? null, cyclesElapsed: state?.cyclesElapsed ?? 0 },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// One historical snapshot per finance cycle (see lib/finance/
// financeEngine.js's runFinanceCycle(), and its own replay log for the
// in-memory equivalent) -- kept as an append-only audit trail a future
// "Finance Replay" viewer can list without needing to replay the whole
// career, the same normalized-table pattern every other module's
// migration already establishes (see e.g. 202609080001_career_module.sql).
export async function appendFinanceReport(report) {
  if ((await resolveSession()).mode === "guest") return; // the guest replay log (financeState.replayLog) already covers this

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("finance_reports").insert({
    user_id: userId,
    revenues: report?.incomeStatement?.revenues ?? {},
    expenses: report?.incomeStatement?.expenses ?? {},
    gop: report?.incomeStatement?.gop ?? 0,
    ebitda: report?.incomeStatement?.ebitda ?? 0,
    cashflow: report?.cashFlow ?? {},
    ratios: report?.ratios ?? {},
    diagnostics: report?.diagnostics ?? [],
    metadata: { period: report?.period ?? null },
  });
  if (error) throw error;
}

export async function saveFinanceForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into finance_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("finance_forecast").upsert(
    { user_id: userId, forecast, metadata: { generatedAt: forecast?.generatedAt ?? null }, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export const financeRepository = { getFinanceState, saveFinanceState, appendFinanceReport, saveFinanceForecast };
export default financeRepository;
