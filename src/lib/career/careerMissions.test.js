import { acceptMission, completeMission, evaluateMissions, missionsJustCompleted, seedMissions } from "./careerMissions";

test("seedMissions starts every mission as available", () => {
  const missions = seedMissions();
  expect(missions.length).toBeGreaterThan(0);
  expect(missions.every((mission) => mission.status === "available")).toBe(true);
});

test("acceptMission moves one mission from available to accepted", () => {
  const missions = seedMissions();
  const next = acceptMission(missions, "occupancy-80", 3);
  const accepted = next.find((mission) => mission.id === "occupancy-80");
  expect(accepted.status).toBe("accepted");
  expect(accepted.acceptedOnDay).toBe(3);
});

test("acceptMission leaves other missions untouched", () => {
  const missions = seedMissions();
  const next = acceptMission(missions, "occupancy-80", 3);
  expect(next.find((mission) => mission.id === "profit-streak").status).toBe("available");
});

test("evaluateMissions auto-completes an accepted mission whose KPI condition is met", () => {
  let missions = seedMissions();
  missions = acceptMission(missions, "occupancy-80", 1);
  const dailyReport = { hotelRevenue: { occupiedRooms: 5 } };
  const evaluated = evaluateMissions(missions, dailyReport, 2);
  expect(evaluated.find((mission) => mission.id === "occupancy-80")).toEqual(expect.objectContaining({ status: "completed", completedOnDay: 2 }));
});

test("evaluateMissions leaves a mission accepted when its condition isn't met", () => {
  let missions = seedMissions();
  missions = acceptMission(missions, "occupancy-80", 1);
  const evaluated = evaluateMissions(missions, { hotelRevenue: { occupiedRooms: 0 } }, 2);
  expect(evaluated.find((mission) => mission.id === "occupancy-80").status).toBe("accepted");
});

test("evaluateMissions never auto-completes a non-auto mission", () => {
  let missions = seedMissions();
  missions = acceptMission(missions, "mini-scenario-pricing", 1);
  const evaluated = evaluateMissions(missions, { profit: 999999 }, 2);
  expect(evaluated.find((mission) => mission.id === "mini-scenario-pricing").status).toBe("accepted");
});

test("completeMission manually completes an accepted, non-auto mission", () => {
  let missions = seedMissions();
  missions = acceptMission(missions, "mini-scenario-pricing", 1);
  const completed = completeMission(missions, "mini-scenario-pricing", 5);
  expect(completed.find((mission) => mission.id === "mini-scenario-pricing")).toEqual(expect.objectContaining({ status: "completed", completedOnDay: 5 }));
});

test("missionsJustCompleted only reports missions that changed status this call", () => {
  let missions = seedMissions();
  missions = acceptMission(missions, "occupancy-80", 1);
  const evaluated = evaluateMissions(missions, { hotelRevenue: { occupiedRooms: 5 } }, 2);
  expect(missionsJustCompleted(missions, evaluated).map((m) => m.id)).toEqual(["occupancy-80"]);
  expect(missionsJustCompleted(evaluated, evaluated)).toEqual([]);
});
