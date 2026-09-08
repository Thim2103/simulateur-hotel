// Channel management -- OTA, direct, réseaux sociaux, email,
// influenceurs (section 1). Reads/writes the same
// hotelState.marketing.channels array the old Marketing.jsx page already
// edited (see lib/hotel.js's hotelMarketing.channels), so an existing
// hotel's channels keep working unchanged.
import { safeArray, safeNumber, safeObject } from "../safe";

export const CHANNEL_CATALOG = [
  { id: "ota", name: "OTA", defaultReach: 65, commissionRate: 0.18 },
  { id: "direct", name: "Direct", defaultReach: 40, commissionRate: 0 },
  { id: "social", name: "Réseaux sociaux", defaultReach: 55, commissionRate: 0 },
  { id: "email", name: "Email", defaultReach: 30, commissionRate: 0 },
  { id: "influencer", name: "Influenceurs", defaultReach: 45, commissionRate: 0.05 },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Per-channel performance: cost per estimated lead, and a rough ROI
// (revenue attributable to the channel's own reach share, against its
// own budget) -- "canaux marketing / performance / conversion / coût"
// (see pages/MarketingChannels.jsx).
export function computeChannelPerformance(channels, { totalRevenue = 0, totalReach = 0 } = {}) {
  const list = safeArray(channels);
  return list.map((channel) => {
    const budget = safeNumber(channel.budget, 0);
    const reach = safeNumber(channel.reach, 0);
    const reachShare = totalReach > 0 ? reach / totalReach : 0;
    const attributedRevenue = Math.round(totalRevenue * reachShare);
    const costPerLead = reach > 0 ? Math.round((budget / reach) * 10) / 10 : 0;
    const roi = budget > 0 ? Math.round((attributedRevenue / budget) * 100) / 100 : 0;
    return { ...channel, reachShare: Math.round(reachShare * 1000) / 10, attributedRevenue, costPerLead, roi };
  });
}

export function toggleChannel(channels, channelId, enabled) {
  return safeArray(channels).map((channel) => (String(channel.id) === String(channelId) ? { ...channel, enabled } : channel));
}

export function adjustChannelBudget(channels, channelId, delta) {
  return safeArray(channels).map((channel) =>
    String(channel.id) === String(channelId) ? { ...channel, budget: Math.max(0, Math.round(safeNumber(channel.budget, 0) + delta)) } : channel
  );
}

// Rotates spend from the weakest-performing enabled channel (lowest
// reach) to the strongest one -- the "changer canal" action (see
// marketingActions.js's "changer-canal").
export function rebalanceChannels(channels) {
  const list = safeArray(channels).map((channel) => safeObject(channel));
  const enabled = list.filter((channel) => channel.enabled !== false);
  if (enabled.length < 2) return list;

  const weakest = enabled.reduce((worst, channel) => (safeNumber(channel.reach, 0) < safeNumber(worst.reach, 0) ? channel : worst), enabled[0]);
  const strongest = enabled.reduce((best, channel) => (safeNumber(channel.reach, 0) > safeNumber(best.reach, 0) ? channel : best), enabled[0]);
  if (weakest.id === strongest.id) return list;

  const shift = Math.round(safeNumber(weakest.budget, 0) * 0.3);
  return list.map((channel) => {
    if (channel.id === weakest.id) return { ...channel, budget: Math.max(0, safeNumber(channel.budget, 0) - shift) };
    if (channel.id === strongest.id) return { ...channel, budget: safeNumber(channel.budget, 0) + shift };
    return channel;
  });
}

export function totalChannelReach(channels) {
  return safeArray(channels)
    .filter((channel) => channel.enabled !== false)
    .reduce((total, channel) => total + safeNumber(channel.reach, 0), 0);
}

export function clampReach(value) {
  return clamp(Math.round(safeNumber(value, 0)), 0, 100);
}
