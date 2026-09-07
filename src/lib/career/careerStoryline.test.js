import { applyConsequenceToHotel, resolveStoryChoice, setCurrentEvent } from "./careerStoryline";

test("setCurrentEvent records the active event id", () => {
  const storyline = setCurrentEvent({ currentEventId: null, history: [] }, "first-week-review");
  expect(storyline.currentEventId).toBe("first-week-review");
});

test("resolveStoryChoice clears the current event and appends to history", () => {
  const storyline = { currentEventId: "first-week-review", history: [] };
  const { storyline: next, consequence } = resolveStoryChoice(storyline, "first-week-review", "reassure", 7);

  expect(next.currentEventId).toBeNull();
  expect(next.history).toHaveLength(1);
  expect(next.history[0]).toEqual(expect.objectContaining({ eventId: "first-week-review", choiceId: "reassure", day: 7 }));
  expect(consequence).toEqual({ reputationDelta: 3 });
});

test("resolveStoryChoice returns a null consequence for an unknown event or choice", () => {
  const storyline = { currentEventId: null, history: [] };
  expect(resolveStoryChoice(storyline, "missing-event", "x", 1).consequence).toBeNull();
  expect(resolveStoryChoice(storyline, "first-week-review", "missing-choice", 1).consequence).toBeNull();
});

test("applyConsequenceToHotel adds a cash delta to the current month's revenue", () => {
  const hotelState = { finance: { revenue: [1000] } };
  const next = applyConsequenceToHotel(hotelState, { cashDelta: 500 });
  expect(next.finance.revenue).toEqual([1500]);
});

test("applyConsequenceToHotel is a no-op without a cashDelta", () => {
  const hotelState = { finance: { revenue: [1000] } };
  expect(applyConsequenceToHotel(hotelState, { reputationDelta: 3 })).toBe(hotelState);
});
