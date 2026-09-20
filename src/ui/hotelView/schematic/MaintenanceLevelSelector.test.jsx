import { render, screen, fireEvent } from "@testing-library/react";
import MaintenanceLevelSelector from "./MaintenanceLevelSelector";
import ExpansionModal from "./ExpansionModal";
import { computeDailyMaintenance, WEAR_THRESHOLD } from "../../../lib/maintenance/maintenanceCostEngine";

const rooms = [
  { id: 1, number: "101", type: "standard" },
  { id: 2, number: "102", type: "deluxe" },
  { id: 3, number: "103", type: "suite" },
]; // 42 € a day at Standard
const compact = (text) => text.replace(/\s| | /g, "");

const renderSelector = (hotelState = {}, props = {}) => render(<MaintenanceLevelSelector hotelState={hotelState} rooms={rooms} onChange={jest.fn()} {...props} />);

describe("MaintenanceLevelSelector / the bill", () => {
  it("shows the day's charges with the breakdown by category", () => {
    renderSelector({ zoneUpgrades: { installed: { "pool-build": { day: 1 } }, works: {}, completedLog: [] } });
    const bill = screen.getByTestId("maintenance-bill");
    expect(bill).toHaveTextContent(/par jour|\/ jour/);
    expect(bill).toHaveTextContent(/chambres/i);
    expect(bill).toHaveTextContent(/équipements/i);
    expect(bill).not.toHaveTextContent(/étages/i);
  });

  it("shows the condition of the hotel", () => {
    renderSelector({ maintenance: { level: "standard", condition: 73 } });
    expect(screen.getByTestId("maintenance-condition")).toHaveTextContent("73/100");
  });

  it("says nothing alarming while the hotel is in good shape", () => {
    renderSelector();
    expect(screen.queryByTestId("maintenance-warning")).not.toBeInTheDocument();
  });

  it("warns, and points to Premium, when the hotel is run down", () => {
    renderSelector({ maintenance: { level: "economy", condition: WEAR_THRESHOLD - 10 } });
    expect(screen.getByTestId("maintenance-warning")).toHaveTextContent(/mauvais état.*premium/i);
  });
});

describe("MaintenanceLevelSelector / the levels", () => {
  it("offers Économique, Standard and Premium as a radio group, Standard selected by default", () => {
    renderSelector();
    expect(screen.getByRole("radiogroup", { name: /niveau d'entretien/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByTestId("maintenance-level-standard")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("maintenance-level-economy")).toHaveAttribute("aria-checked", "false");
  });

  it("reflects the hotel's own level", () => {
    renderSelector({ maintenance: { level: "premium", condition: 80 } });
    expect(screen.getByTestId("maintenance-level-premium")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("maintenance-level-standard")).toHaveAttribute("aria-checked", "false");
  });

  it("shows what each level would cost per day, cheapest first", () => {
    renderSelector();
    const price = (id) => {
      const match = compact(screen.getByTestId(`maintenance-level-${id}`).textContent).match(/·(\d+)€\/j/);
      return Number(match[1]);
    };
    expect(price("standard")).toBe(computeDailyMaintenance({ hotelState: {}, rooms }).total);
    expect(price("economy")).toBeLessThan(price("standard"));
    expect(price("premium")).toBeGreaterThan(price("standard"));
  });

  it("describes what each level does", () => {
    renderSelector();
    expect(screen.getByTestId("maintenance-level-economy")).toHaveTextContent(/se dégrade/i);
    expect(screen.getByTestId("maintenance-level-premium")).toHaveTextContent(/pannes en moins/i);
  });

  it("choosing another level calls onChange with it", () => {
    const onChange = jest.fn();
    renderSelector({}, { onChange });
    fireEvent.click(screen.getByTestId("maintenance-level-premium"));
    expect(onChange).toHaveBeenCalledWith("premium");
  });

  it("clicking the level already in force does nothing", () => {
    const onChange = jest.fn();
    renderSelector({}, { onChange });
    fireEvent.click(screen.getByTestId("maintenance-level-standard"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ExpansionModal / upkeep budget", () => {
  const modal = (props) => render(<ExpansionModal hotelState={{ expansion: { availableCapital: 500000 } }} rooms={rooms} onClose={jest.fn()} {...props} />);

  it("carries the selector when it is given a way to change the level", () => {
    const onSetMaintenanceLevel = jest.fn();
    modal({ onSetMaintenanceLevel });
    fireEvent.click(screen.getByTestId("maintenance-level-economy"));
    expect(onSetMaintenanceLevel).toHaveBeenCalledWith("economy");
  });

  it("has no selector otherwise (existing callers are unaffected)", () => {
    modal();
    expect(screen.queryByTestId("maintenance-selector")).not.toBeInTheDocument();
  });

  it("each fit-out button shows what the room will cost to run every day", () => {
    const hotelState = { expansion: { availableCapital: 500000 }, buildingExpansion: { floors: { 5: { status: "built", startedOnDay: 0, completesOnDay: 5, builtOnDay: 5 } }, completedLog: [] } };
    render(<ExpansionModal hotelState={hotelState} rooms={rooms} onClose={jest.fn()} />);
    expect(compact(screen.getByTestId("fitout-5-standard").textContent)).toContain("5€/j");
    expect(compact(screen.getByTestId("fitout-5-deluxe").textContent)).toContain("12€/j");
    expect(compact(screen.getByTestId("fitout-5-suite").textContent)).toContain("25€/j");
  });
});
