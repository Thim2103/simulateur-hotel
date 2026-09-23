import { render, screen, within } from "@testing-library/react";
import TfeProjectionsPanel from "./TfeProjectionsPanel";
import { takeLoan } from "../../lib/banking/bankingLoanEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [35000], costs: [0], payroll: 9000, fixedCosts: 4000 }, expansion: { availableCapital: 0 }, ...extra });
const restaurant = (extra = {}) => ({ finance: { revenue: [0], costs: [0] }, staff: [], ...extra });
const rooms = [
  { id: 1, number: "101", type: "standard", price: 120, status: "occupée" },
  { id: 2, number: "102", type: "standard", price: 120, status: "libre" },
];
const panel = (section, props = {}) => render(<TfeProjectionsPanel section={section} hotelState={hotel()} restaurantState={restaurant()} rooms={rooms} day={0} {...props} />);

describe("TfeProjectionsPanel / CHAFFs", () => {
  it("liste le chiffre d'affaires par département, une colonne par année", () => {
    panel("chaffs");
    const table = screen.getByTestId("tfe-chaffs-table");
    expect(within(table).getByText("704 Hébergement")).toBeInTheDocument();
    expect(within(table).getByText("702/703 Restauration & Bar")).toBeInTheDocument();
    expect(screen.getByTestId("tfe-chaffs-total")).toBeInTheDocument();
  });

  it("montre le compte de résultat prévisionnel avec l'EBITDA et le résultat net", () => {
    panel("chaffs");
    expect(screen.getByTestId("tfe-income-statement-ebitda")).toBeInTheDocument();
    expect(screen.getByTestId("tfe-income-statement-net")).toBeInTheDocument();
  });
});

describe("TfeProjectionsPanel / plan de trésorerie", () => {
  it("liste 5 années de cash-flow, avec le cumulé", () => {
    panel("cashflow");
    [1, 2, 3, 4, 5].forEach((year) => {
      expect(screen.getByTestId(`tfe-cashflow-row-${year}`)).toBeInTheDocument();
      expect(screen.getByTestId(`tfe-cashflow-cumulative-${year}`)).toBeInTheDocument();
    });
  });

  it("montre le bilan prévisionnel à 3 et 5 ans, équilibré", () => {
    panel("cashflow");
    expect(screen.getByTestId("tfe-balance-sheet-check-3")).toHaveTextContent("Équilibré");
    expect(screen.getByTestId("tfe-balance-sheet-check-5")).toHaveTextContent("Équilibré");
  });

  it("reste équilibré une fois un emprunt contracté", () => {
    const state = takeLoan({ hotelState: hotel() }, "cash", 5000, { day: 1 }).hotelState;
    panel("cashflow", { hotelState: state, day: 1 });
    expect(screen.getByTestId("tfe-balance-sheet-check-3")).toHaveTextContent("Équilibré");
  });
});

describe("TfeProjectionsPanel / ratios & KPIs", () => {
  it("montre les masses bilantaires, cohérentes", () => {
    panel("ratios");
    expect(screen.getByTestId("tfe-masses-check")).toHaveTextContent("trésorerie");
    expect(screen.getByTestId("tfe-masses-tn")).toHaveTextContent("35 000");
  });

  it("montre les ratios, '—' quand ils ne se calculent pas", () => {
    panel("ratios");
    expect(screen.getByTestId("tfe-ratio-autonomie")).toHaveTextContent("100 %");
    expect(screen.getByTestId("tfe-ratio-solvabilite")).toHaveTextContent("—");
  });

  it("montre les KPIs hôteliers du jour", () => {
    panel("ratios");
    expect(screen.getByTestId("tfe-kpi-occupancy")).toHaveTextContent("50 %");
    expect(screen.getByTestId("tfe-kpi-adr")).toHaveTextContent("120");
    expect(screen.getByTestId("tfe-kpi-trevpar")).toHaveTextContent("—"); // no dailyReport given
  });

  it("calcule TrevPAR/CPOR/GOPPAR une fois le rapport du jour fourni", () => {
    panel("ratios", { dailyReport: { hotelRevenue: { netRevenue: 900 }, expenses: { total: 300 } } });
    expect(screen.getByTestId("tfe-kpi-trevpar")).toHaveTextContent("450"); // 900 / 2 rooms
    expect(screen.getByTestId("tfe-kpi-goppar")).toHaveTextContent("300"); // (900-300) / 2
  });
});
