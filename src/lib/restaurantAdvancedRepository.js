// Persistence for the Restaurant Advanced module (see
// lib/restaurantAdvanced/, supabase/migrations/202609170001_restaurant_advanced_module.sql).
// Same shape as lib/clientsRepository.js / lib/housekeepingRepository.js:
// resolveSession() decides Supabase vs guest before anything else runs, so
// a mount-time load can't race ahead of the guest fallback.
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";

const guestRestaurantAdvancedRepository = createGuestRepository("restaurantAdvanced", { defaultState: null });

export async function getRestaurantAdvancedState() {
  if ((await resolveSession()).mode === "guest") return guestRestaurantAdvancedRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("restaurant_advanced_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:restaurant_advanced_state" }
  );
}

export async function saveRestaurantAdvancedState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestRestaurantAdvancedRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("restaurant_advanced_state").upsert(
    {
      user_id: userId,
      state,
      food_cost: state?.foodCost ?? {},
      popularity: state?.popularity ?? {},
      profitability: state?.profitability ?? {},
      menu_engineering: state?.menuEngineering ?? {},
      diagnostics: state?.diagnostics ?? [],
      forecast: state?.forecast ?? {},
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

export async function saveRestaurantAdvancedForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into restaurant_advanced_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("restaurant_advanced_forecast").upsert(
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

export const restaurantAdvancedRepository = { getRestaurantAdvancedState, saveRestaurantAdvancedState, saveRestaurantAdvancedForecast };
export default restaurantAdvancedRepository;
