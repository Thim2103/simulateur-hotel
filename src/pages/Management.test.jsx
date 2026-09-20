import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Management from "./Management";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../context/CareerContext");

const rooms = [{ id: 1, number: "101", type: "standard", status: "libre", price: 120, capacity: 2 }];
const career = (hotelState = {}) => ({ day: 1, startDate: "2026-09-14", hotel: { rooms, reservations: [], hotelState } });
const mount = (value) => {
  useCareerContext.mockReturnValue({ careerState: null, error: null, applyHotelAdjustment: jest.fn().mockResolvedValue(null), ...value });
  return render(<Management />, { wrapper: MemoryRouter });
};

test("has a title and the way in to the staff pages", () => {
  mount();
  expect(screen.getByRole("heading", { level: 1, name: /rh & maintenance/i })).toBeInTheDocument();
  expect(screen.getByTestId("management-link-staff")).toHaveAttribute("href", "/staff");
  expect(screen.getByTestId("management-link-staff-forecast")).toHaveAttribute("href", "/staff/forecast");
  expect(screen.getByTestId("management-link-staff-report")).toHaveAttribute("href", "/staff/report");
  expect(screen.getByTestId("management-link-housekeeping")).toHaveAttribute("href", "/housekeeping");
});

test("asks to start a career when there is none", () => {
  mount();
  expect(screen.getByText(/démarrez votre carrière pour fixer votre budget d'entretien/i)).toBeInTheDocument();
  expect(screen.queryByTestId("maintenance-selector")).not.toBeInTheDocument();
});

test("shows the upkeep budget and changes the level through the hotel adjustment", () => {
  const applyHotelAdjustment = jest.fn().mockResolvedValue(null);
  mount({ careerState: career(), applyHotelAdjustment });
  expect(screen.getByTestId("maintenance-selector")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("maintenance-level-premium"));
  expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
  const next = applyHotelAdjustment.mock.calls[0][0](career().hotel);
  expect(next.hotelState.maintenance.level).toBe("premium");
});

test("counts the breakdowns waiting, or says there are none", () => {
  mount({ careerState: career({ activeIncidents: [{ id: "a", status: "active" }, { id: "b", status: "active" }, { id: "c", status: "resolved" }] }) });
  expect(screen.getByTestId("management-breakdowns")).toHaveTextContent("2 pannes à réparer");
});

test("no breakdown", () => {
  mount({ careerState: career() });
  expect(screen.getByTestId("management-breakdowns")).toHaveTextContent("Aucune panne à réparer");
  expect(screen.getByRole("link", { name: /ouvrir le plan de l'hôtel/i })).toHaveAttribute("href", "/dashboard#hotel-plan");
});

test("shows an error from the career", () => {
  mount({ error: new Error("boom") });
  expect(screen.getByText(/une erreur est survenue : boom/i)).toBeInTheDocument();
});
