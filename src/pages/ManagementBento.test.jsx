import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Management from "./Management";
import { useCareerContext } from "../context/CareerContext";
import { createEmployee } from "../lib/staff/staffRoster";

jest.mock("../context/CareerContext");

const rooms = [{ id: 1, number: "101", type: "standard", status: "libre", price: 120, capacity: 2 }];
const employee = (id, extra = {}) => ({ ...createEmployee({ id, name: `Agent ${id}`, role: "housekeeping", level: "experienced" }), ...extra });
const career = (hotelState = {}) => ({ day: 1, startDate: "2026-09-14", hotel: { rooms, reservations: [], hotelState } });

function mount(hotelState) {
  useCareerContext.mockReturnValue({ careerState: career(hotelState), error: null, applyHotelAdjustment: jest.fn().mockResolvedValue(null) });
  render(<Management />, { wrapper: MemoryRouter });
}

describe("RH & Maintenance as Bento cards", () => {
  it("lays every block out as a Bento card of its own tone", () => {
    mount({ staffRoster: [employee(1)] });
    ["management-staff", "management-wear"].forEach((id) => expect(screen.getByTestId(id)).toHaveClass("bento-card"));
    expect(screen.getByTestId("management-staff")).toHaveAttribute("data-tone", "action");
    expect(screen.getByRole("heading", { level: 2, name: /budget d'entretien/i })).toBeInTheDocument();
  });

  describe("the team", () => {
    it("lists each employee with role, level, morale and fatigue", () => {
      mount({ staffRoster: [employee(1, { morale: 82, fatigue: 25 }), employee(2, { name: "Camille", level: "expert", role: "maintenance" })] });
      const card = screen.getByTestId("management-employee-1");
      expect(card).toHaveTextContent("Agent 1");
      expect(card).toHaveTextContent(/housekeeping/i);
      expect(within(card).getByText("Expérimenté")).toHaveAttribute("data-tone", "action");
      expect(within(card).getByRole("progressbar", { name: "Moral" })).toHaveAttribute("aria-valuenow", "82");
      expect(within(card).getByRole("progressbar", { name: "Fatigue" })).toHaveAttribute("aria-valuenow", "25");
      const other = screen.getByTestId("management-employee-2");
      expect(within(other).getByText("Expert")).toHaveAttribute("data-tone", "vip");
      expect(other).toHaveTextContent(/technicien/i);
    });

    it("says who is on sick leave or in training", () => {
      mount({ staffRoster: [employee(1, { sick: true }), employee(2, { training: { until: 5 } })] });
      expect(within(screen.getByTestId("management-employee-1")).getByText("Arrêt maladie")).toBeInTheDocument();
      expect(within(screen.getByTestId("management-employee-2")).getByText("En formation")).toBeInTheDocument();
    });

    it("gives the head count and the daily payroll", () => {
      mount({ staffRoster: [employee(1), employee(2)] });
      expect(screen.getByTestId("management-staff")).toHaveTextContent(/2 personnes/);
      expect(screen.getByTestId("management-staff")).toHaveTextContent(/masse salariale.*\/ jour/);
    });

    it("points to the staff page when there is no roster yet", () => {
      mount({});
      expect(screen.getByTestId("management-staff")).toHaveTextContent(/aucune équipe enregistrée/i);
      expect(within(screen.getByTestId("management-staff")).getByRole("link", { name: /constituer l'équipe/i })).toHaveAttribute("href", "/staff");
    });
  });

  describe("equipment wear", () => {
    it("shows the hotel's condition on a gauge, healthy above the wear threshold", () => {
      mount({ maintenance: { level: "standard", condition: 90 } });
      expect(screen.getByRole("img", { name: "État de l'hôtel : 90" })).toBeInTheDocument();
      expect(screen.getByTestId("management-wear")).toHaveAttribute("data-tone", "success");
      expect(screen.getByTestId("management-wear-text")).toHaveTextContent(/l'usure reste maîtrisée/i);
    });

    it("turns red and warns below the threshold", () => {
      mount({ maintenance: { level: "economy", condition: 40 } });
      expect(screen.getByTestId("management-wear")).toHaveAttribute("data-tone", "danger");
      expect(screen.getByTestId("management-wear-text")).toHaveTextContent(/pannes d'usure menacent/i);
    });

    it("is orange in between", () => {
      mount({ maintenance: { level: "standard", condition: 70 } });
      expect(screen.getByTestId("management-wear")).toHaveAttribute("data-tone", "vip");
    });

    it("lists each equipment with its state: fine, broken, under repair", () => {
      mount({
        activeIncidents: [
          { id: "a", zone: "laundry", status: "active", severity: "minor" },
          { id: "b", zone: "kitchen", status: "repairing", severity: "minor" },
          { id: "c", zone: "bar", status: "resolved", severity: "minor" },
        ],
      });
      expect(screen.getByTestId("management-equipment-laundry")).toHaveAttribute("data-state", "broken");
      expect(screen.getByTestId("management-equipment-kitchen")).toHaveAttribute("data-state", "repairing");
      expect(screen.getByTestId("management-equipment-bar")).toHaveAttribute("data-state", "ok");
      expect(screen.getByTestId("management-equipment-reception")).toHaveAttribute("data-state", "ok");
      expect(screen.getByTestId("management-equipment-laundry")).toHaveTextContent(/en panne/);
    });
  });

  it("shows neither the team nor the wear before there is a career", () => {
    useCareerContext.mockReturnValue({ careerState: null, error: null, applyHotelAdjustment: jest.fn() });
    render(<Management />, { wrapper: MemoryRouter });
    expect(screen.queryByTestId("management-staff")).not.toBeInTheDocument();
    expect(screen.queryByTestId("management-wear")).not.toBeInTheDocument();
  });
});
