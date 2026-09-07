import { renderHook, act } from "@testing-library/react";
import { useAcademy } from "./useAcademy";
import academyRepository from "../lib/academy/academyRepository";
import replayRepository from "../lib/replay/replayRepository";
import { createScenarioTemplate } from "../lib/scenario/scenarioSchema";

jest.mock("../lib/academy/academyRepository", () => ({
  createClass: jest.fn(),
  createGroup: jest.fn(),
  createAssignment: jest.fn(),
  saveGroupRun: jest.fn(),
  loadClassBundle: jest.fn(),
  loadGroupRun: jest.fn(),
  saveGroupReport: jest.fn(),
  listClasses: jest.fn(),
}));

jest.mock("../lib/replay/replayRepository", () => ({
  saveReplayRun: jest.fn(),
}));

function scenario(overrides = {}) {
  return createScenarioTemplate("academie", {
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 1 },
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  academyRepository.saveGroupRun.mockResolvedValue({});
  academyRepository.saveGroupReport.mockResolvedValue({});
  replayRepository.saveReplayRun.mockResolvedValue({});
});

test("createClass persists then stores the class locally", async () => {
  academyRepository.createClass.mockResolvedValue({ id: "c1", name: "Classe A", teacherId: "u1", createdAt: "2026-09-07T00:00:00Z" });
  const { result } = renderHook(() => useAcademy());

  await act(async () => {
    await result.current.createClass("Classe A");
  });

  expect(result.current.academyState.classes).toEqual([expect.objectContaining({ id: "c1", name: "Classe A" })]);
  expect(result.current.error).toBeNull();
});

test("createGroup persists then stores the group locally", async () => {
  academyRepository.createGroup.mockResolvedValue({ id: "g1", classId: "c1", name: "Groupe A", memberNames: [] });
  const { result } = renderHook(() => useAcademy());

  await act(async () => {
    await result.current.createGroup("c1", "Groupe A");
  });

  expect(result.current.academyState.groups).toEqual([expect.objectContaining({ id: "g1", classId: "c1" })]);
});

test("assignScenario seeds a run per group in the class and persists each one", async () => {
  academyRepository.createGroup.mockResolvedValue({ id: "g1", classId: "c1", name: "Groupe A", memberNames: [] });
  academyRepository.createAssignment.mockResolvedValue({ id: "a1", classId: "c1", scenarioId: "s1", scenario: scenario({ id: "s1" }) });
  const { result } = renderHook(() => useAcademy());

  await act(async () => {
    await result.current.createGroup("c1", "Groupe A");
  });
  await act(async () => {
    await result.current.assignScenario("c1", scenario({ id: "s1" }));
  });

  expect(result.current.academyState.runsByGroupId.g1).toEqual(expect.objectContaining({ status: "running" }));
  expect(academyRepository.saveGroupRun).toHaveBeenCalledWith(expect.objectContaining({ classId: "c1", groupId: "g1", scenarioId: "s1" }));
});

test("loadScenarioProgress reflects the current local state without a network call", async () => {
  academyRepository.createGroup.mockResolvedValue({ id: "g1", classId: "c1", name: "Groupe A", memberNames: [] });
  const { result } = renderHook(() => useAcademy());

  await act(async () => {
    await result.current.createGroup("c1", "Groupe A");
  });

  const progress = result.current.loadScenarioProgress("c1");
  expect(progress).toEqual([expect.objectContaining({ groupId: "g1", status: "not_started" })]);
});

test("runGroupCycle plays a cycle and persists the resulting run", async () => {
  academyRepository.createGroup.mockResolvedValue({ id: "g1", classId: "c1", name: "Groupe A", memberNames: [] });
  academyRepository.createAssignment.mockResolvedValue({ id: "a1", classId: "c1", scenarioId: "s1", scenario: scenario({ id: "s1" }) });
  const { result } = renderHook(() => useAcademy());

  await act(async () => {
    await result.current.createGroup("c1", "Groupe A");
  });
  await act(async () => {
    await result.current.assignScenario("c1", scenario({ id: "s1" }));
  });

  let report;
  await act(async () => {
    report = await result.current.runGroupCycle("c1", "g1", {});
  });

  expect(report.baseReport).toBeDefined();
  expect(result.current.academyState.runsByGroupId.g1.cycleIndex).toBe(1);
  expect(academyRepository.saveGroupRun).toHaveBeenCalledTimes(2); // once from assignScenario, once from runGroupCycle
});

test("generateFinalReport finalizes every unfinalized group and builds the class report", async () => {
  academyRepository.createClass.mockResolvedValue({ id: "c1", name: "Classe A", teacherId: "u1", createdAt: "2026-09-07T00:00:00Z" });
  academyRepository.createGroup.mockResolvedValue({ id: "g1", classId: "c1", name: "Groupe A", memberNames: [] });
  academyRepository.createAssignment.mockResolvedValue({ id: "a1", classId: "c1", scenarioId: "s1", scenario: scenario({ id: "s1" }) });
  const { result } = renderHook(() => useAcademy());

  await act(async () => {
    await result.current.createClass("Classe A");
  });
  await act(async () => {
    await result.current.createGroup("c1", "Groupe A");
  });
  await act(async () => {
    await result.current.assignScenario("c1", scenario({ id: "s1" }));
  });
  await act(async () => {
    await result.current.runGroupCycle("c1", "g1", {});
  });

  let finalReport;
  await act(async () => {
    finalReport = await result.current.generateFinalReport("c1");
  });

  expect(finalReport).toEqual(expect.objectContaining({ classId: "c1", groupCount: 1 }));
  expect(academyRepository.saveGroupReport).toHaveBeenCalledWith(expect.objectContaining({ classId: "c1", groupId: "g1" }));
  expect(replayRepository.saveReplayRun).toHaveBeenCalledWith(expect.objectContaining({ id: "academie-c1-g1", source: "academie" }));
});

test("loadClassState() with no classId refreshes the teacher's whole class roster", async () => {
  academyRepository.listClasses.mockResolvedValue([{ id: "c1", name: "Classe A", teacherId: "u1", createdAt: "2026-09-07T00:00:00Z" }]);
  const { result } = renderHook(() => useAcademy());

  await act(async () => {
    await result.current.loadClassState();
  });

  expect(result.current.academyState.classes).toEqual([expect.objectContaining({ id: "c1", name: "Classe A" })]);
});

test("surfaces an error instead of silently failing", async () => {
  academyRepository.createClass.mockRejectedValue(new Error("Supabase indisponible"));
  const { result } = renderHook(() => useAcademy());

  await act(async () => {
    await expect(result.current.createClass("Classe A")).rejects.toThrow("Supabase indisponible");
  });

  expect(result.current.error).toEqual(expect.any(Error));
});
