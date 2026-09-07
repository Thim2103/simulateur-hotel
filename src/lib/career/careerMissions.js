// Missions: player-accepted goals with a KPI condition (auto-completed
// once the day's DailyReport satisfies it) or a manual/story condition
// (completed explicitly via completeMission()). Reuses
// lib/scenario/scenarioObjectives.js's readKpi() for the KPI check, same
// format as careerObjectives.js.
import { safeArray, safeString } from "../safe";
import { readKpi } from "../scenario/scenarioObjectives";

export const MISSION_CATALOG = [
  {
    id: "occupancy-80",
    title: "Salle comble",
    description: "Atteindre 80% de taux d'occupation sur une journée.",
    kpi: "hotelRevenue.occupiedRooms",
    comparator: "gte",
    target: 1,
    auto: true,
    rewardId: "cash-500",
  },
  {
    id: "profit-streak",
    title: "Trois jours rentables",
    description: "Enchaîner trois journées de profit positif.",
    kpi: "profit",
    comparator: "gte",
    target: 1,
    auto: true,
    rewardId: "skill-point-management",
  },
  {
    id: "mini-scenario-pricing",
    title: "Cas pratique : tarification de crise",
    description: "Relevez un mini-scénario de tarification sous contrainte (voir careerEngine.runMiniScenarioChallenge()).",
    auto: false,
    rewardId: "cash-1000",
  },
];

export function createMissionInstance(definition) {
  return { ...definition, status: "available", acceptedOnDay: null, completedOnDay: null };
}

export function seedMissions(catalog = MISSION_CATALOG) {
  return safeArray(catalog).map(createMissionInstance);
}

export function acceptMission(missions, missionId, day) {
  return safeArray(missions).map((mission) => (mission.id === missionId && mission.status === "available" ? { ...mission, status: "accepted", acceptedOnDay: day } : mission));
}

// Auto-completes every accepted, auto-checked mission whose KPI condition
// the day's DailyReport satisfies.
export function evaluateMissions(missions, dailyReport, day) {
  return safeArray(missions).map((mission) => {
    if (mission.status !== "accepted" || !mission.auto) return mission;
    const value = readKpi(dailyReport, mission.kpi);
    const satisfied = value !== null && value >= mission.target;
    return satisfied ? { ...mission, status: "completed", completedOnDay: day } : mission;
  });
}

// Manually completes a mission (a story/mini-scenario mission that isn't
// auto-checked, or an early completion the player triggers explicitly).
export function completeMission(missions, missionId, day) {
  return safeArray(missions).map((mission) => (mission.id === missionId && mission.status === "accepted" ? { ...mission, status: "completed", completedOnDay: day } : mission));
}

export function missionsJustCompleted(previousMissions, nextMissions) {
  const previouslyCompleted = new Set(safeArray(previousMissions).filter((m) => m.status === "completed").map((m) => m.id));
  return safeArray(nextMissions).filter((mission) => mission.status === "completed" && !previouslyCompleted.has(mission.id));
}

export function missionTitle(missionId) {
  return safeString(MISSION_CATALOG.find((mission) => mission.id === missionId)?.title, missionId);
}
