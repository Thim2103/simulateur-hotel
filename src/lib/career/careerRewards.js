// Rewards: granted to an inbox by missions/story choices, claimed
// explicitly by the player (claimReward() in useCareer.js) rather than
// applied automatically -- so a reward always shows up as something the
// player did, not a silent state change.
import { safeArray, safeNumber, safeObject } from "../safe";

export const REWARD_CATALOG = {
  "cash-500": { label: "Prime de 500 €", type: "cash", amount: 500 },
  "cash-1000": { label: "Prime de 1 000 €", type: "cash", amount: 1000 },
  "skill-point-management": { label: "2 points de Gestion", type: "skill", skillId: "management", amount: 2 },
};

export function grantReward(rewardsInbox, rewardId, sourceLabel = "") {
  const definition = REWARD_CATALOG[rewardId];
  if (!definition) return rewardsInbox;
  return [...safeArray(rewardsInbox), { id: `${rewardId}-${Date.now()}`, rewardId, ...definition, sourceLabel, claimed: false }];
}

// Removes the reward from the inbox and returns its effect for
// careerEngine.js to apply (a cash delta to the hotel's finance, or skill
// points to add).
export function claimReward(rewardsInbox, rewardEntryId) {
  const entry = safeArray(rewardsInbox).find((reward) => reward.id === rewardEntryId);
  if (!entry || entry.claimed) return { rewardsInbox, effect: null };
  return {
    rewardsInbox: safeArray(rewardsInbox).filter((reward) => reward.id !== rewardEntryId),
    effect: entry.type === "cash" ? { cashDelta: entry.amount } : { skillId: entry.skillId, skillPoints: entry.amount },
  };
}

export function applyCashRewardToHotel(hotelState, cashDelta) {
  if (!cashDelta) return hotelState;
  const finance = safeObject(hotelState?.finance);
  const revenue = safeArray(finance.revenue);
  const nextRevenue = revenue.length ? [...revenue] : [0];
  nextRevenue[nextRevenue.length - 1] = safeNumber(nextRevenue[nextRevenue.length - 1], 0) + cashDelta;
  return { ...hotelState, finance: { ...finance, revenue: nextRevenue } };
}
