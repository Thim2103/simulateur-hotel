import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffRosterPanel from "./StaffRosterPanel";
import { createEmployee, dailySalaryFor, hiringCost, severanceCost, rosterDailyPayroll } from "../../lib/staff/staffRoster";

const emp = (overrides = {}) => createEmployee({ id: "e1", name: "Ada", role: "housekeeping", level: "beginner", ...overrides });
const hotel = (roster, extra = {}) => ({ staffRoster: roster, finance: { payroll: 30000, costs: [0, 100] }, ...extra });

// The panel only ever hands `onAdjust` a (bundle) => bundle updater; run it
// against a bundle to see what it would really do.
function applied(onAdjust, hotelState, call = 0) {
  return onAdjust.mock.calls[call][0]({ hotelState }).hotelState;
}

function renderPanel(props) {
  return render(
    <MemoryRouter>
      <StaffRosterPanel day={5} onAdjust={jest.fn()} {...props} />
    </MemoryRouter>
  );
}

describe("StaffRosterPanel / no roster yet", () => {
  it("offers to set up a starter team, and doing so seeds one", () => {
    const onAdjust = jest.fn();
    const state = { finance: { payroll: 38000 } };
    renderPanel({ hotelState: state, onAdjust });
    expect(screen.queryByTestId("roster-employee")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /constituer l'équipe de départ/i }));
    const next = applied(onAdjust, state);
    expect(next.staffRoster.length).toBeGreaterThan(0);
  });
});

describe("StaffRosterPanel / overview", () => {
  it("lists each employee with role, level, daily salary, fatigue and morale", () => {
    renderPanel({ hotelState: hotel([emp()]) });
    const row = screen.getByTestId("roster-employee");
    expect(row).toHaveTextContent("Ada");
    expect(row).toHaveTextContent(/gouvernante/i);
    expect(row).toHaveTextContent("Débutant");
    expect(row).toHaveTextContent(/fatigue 20\/100/i);
    expect(row).toHaveTextContent(/moral 70\/100/i);
    expect(row).toHaveTextContent(`${dailySalaryFor("housekeeping", "beginner")} €`);
  });

  it("shows the daily payroll of the roster", () => {
    const roster = [emp(), emp({ id: "e2", role: "maintenance", level: "expert" })];
    renderPanel({ hotelState: hotel(roster) });
    expect(screen.getByTestId("roster-daily-payroll").textContent.replace(/\s| | /g, "")).toContain(`${rosterDailyPayroll({ staffRoster: roster })}€`);
  });

  it("shows coverage from the day's snapshot, and warns about a slower cleaning when short", () => {
    const staffing = { housekeepingCoverage: 0.5, receptionCoverage: 1.2, cleaningDelayFactor: 2, technicians: 0 };
    renderPanel({ hotelState: hotel([emp()], { staffing }) });
    expect(screen.getByTestId("roster-hk-coverage")).toHaveTextContent("50 %");
    expect(screen.getByTestId("roster-reception-coverage")).toHaveTextContent("120 %");
    expect(screen.getByTestId("roster-cleaning-delay")).toHaveTextContent(/×2\.0 plus long/);
  });

  it("does not warn about cleaning time when staffed", () => {
    renderPanel({ hotelState: hotel([emp()], { staffing: { housekeepingCoverage: 1.1, receptionCoverage: 1, cleaningDelayFactor: 1 } }) });
    expect(screen.queryByTestId("roster-cleaning-delay")).not.toBeInTheDocument();
  });

  it("shows an employee's training in progress and hides the Former button for them", () => {
    renderPanel({ hotelState: hotel([{ ...emp(), training: { untilDay: 8, toLevel: "experienced" } }]) });
    const row = screen.getByTestId("roster-employee");
    expect(row).toHaveTextContent(/en formation → expérimenté \(jour 8\)/i);
    expect(within(row).queryByRole("button", { name: /former/i })).not.toBeInTheDocument();
  });

  it("does not offer training to an expert", () => {
    renderPanel({ hotelState: hotel([emp({ level: "expert" })]) });
    expect(screen.queryByRole("button", { name: /former/i })).not.toBeInTheDocument();
  });

  it("links to the restaurant staff page for kitchen/service", () => {
    renderPanel({ hotelState: hotel([]) });
    expect(screen.getByRole("link", { name: /personnel du restaurant/i })).toHaveAttribute("href", "/restaurant/hr");
  });
});

describe("StaffRosterPanel / actions", () => {
  it("recruiting sends a hire with the chosen role and level, and previews its cost", () => {
    const onAdjust = jest.fn();
    const state = hotel([]);
    renderPanel({ hotelState: state, onAdjust });

    fireEvent.change(screen.getByLabelText("Poste"), { target: { value: "maintenance" } });
    fireEvent.change(screen.getByLabelText("Niveau"), { target: { value: "expert" } });
    expect(screen.getByTestId("hire-preview").textContent.replace(/\s| | /g, "")).toContain(`${hiringCost("maintenance", "expert")}€`);

    fireEvent.click(screen.getByRole("button", { name: "Recruter" }));
    const next = applied(onAdjust, state);
    expect(next.staffRoster).toHaveLength(1);
    expect(next.staffRoster[0]).toMatchObject({ role: "maintenance", level: "expert", hiredOnDay: 5 });
    expect(next.finance.costs[1]).toBe(100 + hiringCost("maintenance", "expert"));
  });

  it("training sends a train request for that employee", () => {
    const onAdjust = jest.fn();
    const state = hotel([emp()]);
    renderPanel({ hotelState: state, onAdjust });
    fireEvent.click(screen.getByRole("button", { name: /former/i }));
    expect(applied(onAdjust, state).staffRoster[0].training).toEqual({ untilDay: 8, toLevel: "experienced" });
  });

  it("firing needs a confirmation, shows the severance, then removes the employee", () => {
    const onAdjust = jest.fn();
    const state = hotel([emp(), emp({ id: "e2", name: "Bob" })]);
    renderPanel({ hotelState: state, onAdjust });

    fireEvent.click(screen.getAllByRole("button", { name: "Licencier" })[0]);
    expect(onAdjust).not.toHaveBeenCalled();
    const confirm = screen.getByRole("button", { name: /confirmer le licenciement/i });
    expect(confirm.textContent.replace(/\s| | /g, "")).toContain(`${severanceCost(emp())}€`);

    fireEvent.click(confirm);
    expect(applied(onAdjust, state).staffRoster.map((e) => e.id)).toEqual(["e2"]);
  });

  it("cancelling a firing does nothing", () => {
    const onAdjust = jest.fn();
    renderPanel({ hotelState: hotel([emp()]), onAdjust });
    fireEvent.click(screen.getByRole("button", { name: "Licencier" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onAdjust).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Licencier" })).toBeInTheDocument();
  });

  it("disables every action while a save is running", () => {
    renderPanel({ hotelState: hotel([emp()]), isRunning: true });
    expect(screen.getByRole("button", { name: "Recruter" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /former/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Licencier" })).toBeDisabled();
  });
});

describe("StaffRosterPanel / coverage display", () => {
  it("caps an oversized team's coverage instead of showing a huge percentage", () => {
    renderPanel({ hotelState: hotel([emp()], { staffing: { housekeepingCoverage: 8.67, receptionCoverage: 8.33, cleaningDelayFactor: 1 } }) });
    expect(screen.getByTestId("roster-hk-coverage")).toHaveTextContent("200 %+");
    expect(screen.getByTestId("roster-reception-coverage")).toHaveTextContent("200 %+");
  });
});
