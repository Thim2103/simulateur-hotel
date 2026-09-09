import { feedbackForAction } from "./decisionFeedback";

test("pricing decisions pulse the rooms", () => {
  expect(feedbackForAction("increase-prices", "pricing")).toEqual({ target: "rooms", animation: "pulse" });
});

test("staff decisions animate staff walking", () => {
  expect(feedbackForAction("boost-staff-morale", "staff")).toEqual({ target: "staff", animation: "walking" });
});

test("marketing decisions shimmer the reception", () => {
  expect(feedbackForAction("increase-marketing", "marketing")).toEqual({ target: "reception", animation: "shimmer" });
});

test("schedule-maintenance flags a housekeeping cleaning flash", () => {
  expect(feedbackForAction("schedule-maintenance", "operations")).toEqual({ target: "housekeeping", animation: "cleaning" });
});

test("other operations decisions bounce the restaurant", () => {
  expect(feedbackForAction("some-other-op", "operations")).toEqual({ target: "restaurant", animation: "bounce" });
});
