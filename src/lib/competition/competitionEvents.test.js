import { createSeededRng, ensureSharedSeed, injectGlobalEvent } from "./competitionEvents";

test("ensureSharedSeed leaves an existing seed untouched", () => {
  const scenario = { replay: { seed: "my-seed" } };
  expect(ensureSharedSeed(scenario, "m1").replay.seed).toBe("my-seed");
});

test("ensureSharedSeed stamps a stable seed derived from the match id when missing", () => {
  const scenario = { replay: {} };
  const first = ensureSharedSeed(scenario, "m1").replay.seed;
  const second = ensureSharedSeed(scenario, "m1").replay.seed;
  expect(first).toBe(second);
  expect(first).toBeTruthy();
});

test("createSeededRng is deterministic: same seed + cycle -> same sequence", () => {
  const a = createSeededRng("seed-x", 3);
  const b = createSeededRng("seed-x", 3);
  const drawsA = [a(), a(), a()];
  const drawsB = [b(), b(), b()];
  expect(drawsA).toEqual(drawsB);
});

test("createSeededRng produces different sequences for different cycles or seeds", () => {
  const cycle0 = createSeededRng("seed-x", 0)();
  const cycle1 = createSeededRng("seed-x", 1)();
  expect(cycle0).not.toBe(cycle1);

  const otherSeed = createSeededRng("seed-y", 0)();
  expect(otherSeed).not.toBe(cycle0);
});

test("createSeededRng always returns a value in [0, 1)", () => {
  const rng = createSeededRng("seed-x", 0);
  for (let i = 0; i < 20; i += 1) {
    const value = rng();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  }
});

test("injectGlobalEvent appends to the shared scenario and re-points every player's run", () => {
  const match = { scenario: { events: [{ id: "existing" }] } };
  const runsByPlayerId = { p1: { scenario: { events: [{ id: "existing" }] } }, p2: null };

  const { scenario, runsByPlayerId: nextRuns } = injectGlobalEvent(match, runsByPlayerId, { id: "crisis" });

  expect(scenario.events.map((e) => e.id)).toEqual(["existing", "crisis"]);
  expect(nextRuns.p1.scenario.events.map((e) => e.id)).toEqual(["existing", "crisis"]);
  expect(nextRuns.p2).toBeNull();
});
