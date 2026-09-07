import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AcademyClass from "./AcademyClass";
import { useAcademyContext } from "../context/AcademyContext";

jest.mock("../context/AcademyContext");

function renderAtClass(classId = "c1") {
  return render(
    <MemoryRouter initialEntries={[`/academy/${classId}`]}>
      <Routes>
        <Route path="/academy/:classId" element={<AcademyClass />} />
      </Routes>
    </MemoryRouter>
  );
}

function baseHook(overrides = {}) {
  return {
    academyState: { classes: [{ id: "c1", name: "Classe A" }], groups: [], assignments: [], runsByGroupId: {}, reportsByGroupId: {} },
    isRunning: false,
    error: null,
    loadClassState: jest.fn().mockResolvedValue(undefined),
    createGroup: jest.fn().mockResolvedValue({ id: "g1" }),
    assignScenario: jest.fn().mockResolvedValue({ id: "a1" }),
    loadScenarioProgress: jest.fn().mockReturnValue([]),
    ...overrides,
  };
}

test("loads the class bundle for the routed classId", () => {
  const loadClassState = jest.fn().mockResolvedValue(undefined);
  useAcademyContext.mockReturnValue(baseHook({ loadClassState }));
  renderAtClass("c1");
  expect(loadClassState).toHaveBeenCalledWith("c1");
});

test("shows the class name and prompts to add a group before assigning a scenario", () => {
  useAcademyContext.mockReturnValue(baseHook());
  renderAtClass();
  expect(screen.getByText("Classe A")).toBeInTheDocument();
  expect(screen.getByText(/créez au moins un groupe/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /assigner à la classe/i })).toBeDisabled();
});

test("creating a group calls createGroup with the class id and typed name", () => {
  const createGroup = jest.fn().mockResolvedValue({ id: "g1" });
  useAcademyContext.mockReturnValue(baseHook({ createGroup }));
  renderAtClass();

  fireEvent.change(screen.getByPlaceholderText(/groupe 1/i), { target: { value: "Groupe A" } });
  fireEvent.click(screen.getByRole("button", { name: /ajouter/i }));

  expect(createGroup).toHaveBeenCalledWith("c1", "Groupe A");
});

test("assigning a scenario calls assignScenario once a group exists", () => {
  const assignScenario = jest.fn().mockResolvedValue({ id: "a1" });
  useAcademyContext.mockReturnValue(
    baseHook({ assignScenario, academyState: { classes: [{ id: "c1", name: "Classe A" }], groups: [{ id: "g1", classId: "c1", name: "Groupe A" }], assignments: [], runsByGroupId: {}, reportsByGroupId: {} } })
  );
  renderAtClass();

  fireEvent.click(screen.getByRole("button", { name: /assigner à la classe/i }));
  expect(assignScenario).toHaveBeenCalledWith("c1", expect.objectContaining({ title: expect.any(String) }));
});

test("shows the progress table with a link into each group", () => {
  useAcademyContext.mockReturnValue(
    baseHook({ loadScenarioProgress: jest.fn().mockReturnValue([{ groupId: "g1", groupName: "Groupe A", status: "running", cycleIndex: 1, totalCycles: 5, currentScore: 60 }]) })
  );
  renderAtClass();

  expect(screen.getByText("Groupe A")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /ouvrir/i })).toHaveAttribute("href", "/academy/c1/group/g1");
});
