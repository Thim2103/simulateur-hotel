import { mapMessageToAction, openModuleForMessage, applyDecision } from "./GmMessageRouter";

test("mapMessageToAction resolves a message type to its business module", () => {
  expect(mapMessageToAction("HOUSEKEEPING_OVERLOAD")).toBe("housekeeping");
  expect(mapMessageToAction("RM_DEMAND_SPIKE")).toBe("rmAdvanced");
  expect(mapMessageToAction("OWNER_REQUEST")).toBe("pro");
  expect(mapMessageToAction("unknown-type")).toBe("career");
});

test("openModuleForMessage resolves a message to a real route", () => {
  expect(openModuleForMessage({ module: "housekeeping" })).toBe("/housekeeping");
  expect(openModuleForMessage({ module: "rmAdvanced" })).toBe("/rm-advanced");
  expect(openModuleForMessage({ module: "pro" })).toBe("/pro/dashboard");
  expect(openModuleForMessage({ module: "unknown" })).toBe("/dashboard");
});

test("applyDecision routes a hotelBundle-based message through applyHotelAdjustment with the right applier", async () => {
  const applyHotelAdjustment = jest.fn(async (transform) => transform({ hotelState: { staff: {} }, restaurantState: { staff: [] } }));
  await applyDecision({ module: "staff" }, "recruter", { applyHotelAdjustment });
  expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
});

test("applyDecision routes a Pro message through applyProAction instead", async () => {
  const applyProAction = jest.fn().mockResolvedValue({ ok: true });
  const result = await applyDecision({ module: "pro" }, "plan-relance-globale", { applyProAction });
  expect(applyProAction).toHaveBeenCalledWith("plan-relance-globale");
  expect(result).toEqual({ ok: true });
});

test("applyDecision throws a clear error when the required context is missing", async () => {
  await expect(applyDecision({ module: "staff" }, "recruter", {})).rejects.toThrow(/applyHotelAdjustment/);
  await expect(applyDecision({ module: "pro" }, "x", {})).rejects.toThrow(/applyProAction/);
});
