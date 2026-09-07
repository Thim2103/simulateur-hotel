import { applyCashRewardToHotel, claimReward, grantReward } from "./careerRewards";

test("grantReward adds an unclaimed entry from the catalog", () => {
  const inbox = grantReward([], "cash-500", "Salle comble");
  expect(inbox).toHaveLength(1);
  expect(inbox[0]).toEqual(expect.objectContaining({ rewardId: "cash-500", label: "Prime de 500 €", claimed: false, sourceLabel: "Salle comble" }));
});

test("grantReward is a no-op for an unknown reward id", () => {
  expect(grantReward([], "does-not-exist")).toEqual([]);
});

test("claimReward removes the entry and returns a cash effect", () => {
  const inbox = grantReward([], "cash-500");
  const { rewardsInbox, effect } = claimReward(inbox, inbox[0].id);
  expect(rewardsInbox).toEqual([]);
  expect(effect).toEqual({ cashDelta: 500 });
});

test("claimReward returns a skill effect for a skill-type reward", () => {
  const inbox = grantReward([], "skill-point-management");
  const { effect } = claimReward(inbox, inbox[0].id);
  expect(effect).toEqual({ skillId: "management", skillPoints: 2 });
});

test("claimReward is a no-op for an unknown entry id", () => {
  const inbox = grantReward([], "cash-500");
  const { rewardsInbox, effect } = claimReward(inbox, "missing-id");
  expect(rewardsInbox).toBe(inbox);
  expect(effect).toBeNull();
});

test("applyCashRewardToHotel adds to the current month's revenue", () => {
  const hotelState = { finance: { revenue: [1000] } };
  expect(applyCashRewardToHotel(hotelState, 500).finance.revenue).toEqual([1500]);
});
