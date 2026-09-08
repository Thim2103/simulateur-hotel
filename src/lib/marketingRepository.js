// Persistence for the Marketing module (see lib/marketing/, supabase/
// migrations/202609120001_marketing_module.sql). Same shape as
// lib/financeRepository.js/lib/staffRepository.js: resolveSession()
// decides Supabase vs guest before anything else runs, so a mount-time
// load can't race ahead of the guest fallback (see useCareer.js's
// docstring for the race this pattern avoids).
import { assertSupabaseConfigured, requireUserId } from "./supabase";
import { resolveSession } from "./sessionResolver";
import { createGuestRepository } from "./guest/guestRepository";
import { safeLoad } from "./safeLoad";
import { safeArray } from "./safe";

const guestMarketingRepository = createGuestRepository("marketing", { defaultState: null });

export async function getMarketingState() {
  if ((await resolveSession()).mode === "guest") return guestMarketingRepository.get();

  const userId = await requireUserId();
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("marketing_state").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row ? row.state : null;
    },
    null,
    { label: "select:marketing_state" }
  );
}

export async function saveMarketingState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestMarketingRepository.save(state);
    return;
  }

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("marketing_state").upsert(
    {
      user_id: userId,
      state,
      budget: state?.budget ?? {},
      roi: state?.roi ?? {},
      conversion: state?.conversion ?? {},
      reputation: state?.reputation ?? 0,
      segments: state?.segments ?? {},
      channels: state?.channels ?? [],
      campaigns: state?.campaigns ?? [],
      forecast: state?.forecast ?? {},
      diagnostics: state?.diagnostics ?? [],
      metadata: { period: state?.period ?? null, cyclesElapsed: state?.cyclesElapsed ?? 0, positioningTier: state?.positioningTier ?? null },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// One row per campaign -- "tables ... marketing_campaigns" (section 6).
// A guest keeps every campaign inside marketing_state.state.campaigns
// (already covered), same convention as
// lib/financeRepository.js/lib/staffRepository.js's own per-table guest
// no-ops.
export async function saveMarketingCampaigns(campaigns) {
  if ((await resolveSession()).mode === "guest") return;

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const rows = safeArray(campaigns).map((campaign) => ({
    user_id: userId,
    campaign_id: String(campaign.id),
    name: campaign.name ?? "",
    objective: campaign.objective ?? "",
    status: campaign.status ?? "draft",
    budget: campaign.budget ?? 0,
    conversion: campaign.conversion ?? 0,
    roi: campaign.roi ?? 0,
    metadata: { demandUplift: campaign.demandUplift ?? 0 },
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await client.from("marketing_campaigns").upsert(rows, { onConflict: "user_id,campaign_id" });
  if (error) throw error;
}

// One row per channel -- "tables ... marketing_channels" (section 6).
export async function saveMarketingChannels(channels) {
  if ((await resolveSession()).mode === "guest") return;

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const rows = safeArray(channels).map((channel) => ({
    user_id: userId,
    channel_id: String(channel.id),
    name: channel.name ?? "",
    enabled: channel.enabled !== false,
    budget: channel.budget ?? 0,
    reach: channel.reach ?? 0,
    metadata: { roi: channel.roi ?? 0, costPerLead: channel.costPerLead ?? 0 },
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await client.from("marketing_channels").upsert(rows, { onConflict: "user_id,channel_id" });
  if (error) throw error;
}

export async function saveMarketingForecast(forecast) {
  if ((await resolveSession()).mode === "guest") return; // folded into marketing_state's own `forecast` column for a guest

  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("marketing_forecast").upsert(
    { user_id: userId, forecast, metadata: { generatedAt: forecast?.generatedAt ?? null }, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export const marketingRepository = { getMarketingState, saveMarketingState, saveMarketingCampaigns, saveMarketingChannels, saveMarketingForecast };
export default marketingRepository;
