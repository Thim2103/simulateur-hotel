import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AcademyDashboard from "./AcademyDashboard";
import { useAcademyContext } from "../context/AcademyContext";

jest.mock("../context/AcademyContext");

function baseHook(overrides = {}) {
  return {
    academyState: { classes: [], groups: [], assignments: [], runsByGroupId: {}, reportsByGroupId: {} },
    isRunning: false,
    error: null,
    loadClassState: jest.fn().mockResolvedValue(undefined),
    createClass: jest.fn().mockResolvedValue({ id: "c1" }),
    ...overrides,
  };
}

test("loads the class roster on mount", () => {
  const loadClassState = jest.fn().mockResolvedValue(undefined);
  useAcademyContext.mockReturnValue(baseHook({ loadClassState }));
  render(<AcademyDashboard />, { wrapper: MemoryRouter });
  expect(loadClassState).toHaveBeenCalledWith();
});

test("shows an empty state when there are no classes yet", () => {
  useAcademyContext.mockReturnValue(baseHook());
  render(<AcademyDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune classe pour le moment/i)).toBeInTheDocument();
});

test("creating a class calls createClass with the typed name", () => {
  const createClass = jest.fn().mockResolvedValue({ id: "c1" });
  useAcademyContext.mockReturnValue(baseHook({ createClass }));
  render(<AcademyDashboard />, { wrapper: MemoryRouter });

  fireEvent.change(screen.getByPlaceholderText(/bts hôtellerie/i), { target: { value: "Classe A" } });
  fireEvent.click(screen.getByRole("button", { name: /créer la classe/i }));

  expect(createClass).toHaveBeenCalledWith("Classe A");
});

test("lists existing classes with their group count and a link to open them", () => {
  useAcademyContext.mockReturnValue(
    baseHook({
      academyState: {
        classes: [{ id: "c1", name: "Classe A" }],
        groups: [{ id: "g1", classId: "c1" }],
        assignments: [],
        runsByGroupId: {},
        reportsByGroupId: {},
      },
    })
  );
  render(<AcademyDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("Classe A")).toBeInTheDocument();
  expect(screen.getByText(/1 groupe/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /ouvrir la classe/i })).toHaveAttribute("href", "/academy/c1");
});

test("shows an error banner when a request fails", () => {
  useAcademyContext.mockReturnValue(baseHook({ error: new Error("Supabase indisponible") }));
  render(<AcademyDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByText(/supabase indisponible/i)).toBeInTheDocument();
});
