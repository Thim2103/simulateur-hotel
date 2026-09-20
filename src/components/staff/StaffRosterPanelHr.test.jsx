import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffRosterPanel from "./StaffRosterPanel";
import { createEmployee } from "../../lib/staff/staffRoster";

const emp = (overrides = {}) => ({ ...createEmployee({ id: "e1", name: "Ada", role: "housekeeping", level: "beginner" }), ...overrides });
const hotel = (roster, extra = {}) => ({ staffRoster: roster, finance: { payroll: 30000, costs: [0, 100] }, ...extra });

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

describe("StaffRosterPanel / morale and fatigue gauges", () => {
  const bar = (row, label) => within(row).getByRole("progressbar", { name: label });

  it("shows a colour-coded gauge for fatigue and for morale on each employee", () => {
    renderPanel({ hotelState: hotel([emp({ fatigue: 90, morale: 20 })]) });
    const row = screen.getByTestId("roster-employee");
    expect(bar(row, "Fatigue")).toHaveAttribute("aria-valuenow", "90");
    expect(bar(row, "Fatigue")).toHaveAttribute("data-health", "bad"); // high fatigue is bad
    expect(bar(row, "Moral")).toHaveAttribute("aria-valuenow", "20");
    expect(bar(row, "Moral")).toHaveAttribute("data-health", "bad"); // low morale is bad
  });

  it("colours a rested, happy employee green and an in-between one amber", () => {
    renderPanel({ hotelState: hotel([emp({ fatigue: 10, morale: 90 }), emp({ id: "e2", fatigue: 50, morale: 50 })]) });
    const [happy, middling] = screen.getAllByTestId("roster-employee");
    expect(bar(happy, "Fatigue")).toHaveAttribute("data-health", "good");
    expect(bar(happy, "Moral")).toHaveAttribute("data-health", "good");
    expect(bar(middling, "Fatigue")).toHaveAttribute("data-health", "warn");
    expect(bar(middling, "Moral")).toHaveAttribute("data-health", "warn");
  });

  it("keeps the numeric readout next to each gauge", () => {
    renderPanel({ hotelState: hotel([emp({ fatigue: 33, morale: 71 })]) });
    const row = screen.getByTestId("roster-employee");
    expect(row).toHaveTextContent("Fatigue 33/100");
    expect(row).toHaveTextContent("Moral 71/100");
  });
});

describe("StaffRosterPanel / HR alerts", () => {
  it("flags a resignation notice, a sick employee and a raise request, and lists them in the alerts", () => {
    const roster = [
      emp({ id: "a", name: "Ada", resignation: { noticeUntilDay: 7 } }),
      emp({ id: "b", name: "Bob", sick: true, sickUntilDay: 6 }),
      emp({ id: "c", name: "Cy", raiseRequested: true }),
    ];
    renderPanel({ hotelState: hotel(roster) });
    const rows = screen.getAllByTestId("roster-employee");
    expect(rows[0]).toHaveTextContent(/préavis de démission \(départ jour 7\)/i);
    expect(rows[1]).toHaveTextContent(/malade \(retour jour 7\)/i);
    expect(rows[2]).toHaveTextContent(/demande une augmentation/i);

    const alerts = screen.getByTestId("roster-alerts");
    expect(alerts).toHaveTextContent(/ada a donné son préavis/i);
    expect(alerts).toHaveTextContent(/bob est en arrêt maladie/i);
    expect(alerts).toHaveTextContent(/cy demande une augmentation/i);
  });

  it("shows no alerts panel for a calm team", () => {
    renderPanel({ hotelState: hotel([emp()]) });
    expect(screen.queryByTestId("roster-alerts")).not.toBeInTheDocument();
  });
});

describe("StaffRosterPanel / bonus and raise", () => {
  it("the bonus button charges the bonus and lifts morale", () => {
    const onAdjust = jest.fn();
    const state = hotel([emp({ morale: 30 })]);
    renderPanel({ hotelState: state, onAdjust });
    fireEvent.click(screen.getByRole("button", { name: /^prime/i }));
    const next = applied(onAdjust, state);
    expect(next.staffRoster[0].morale).toBe(50);
    expect(next.finance.costs[1]).toBe(100 + emp().dailySalary * 5);
  });

  it("the raise button gives +10 % and answers a pending request", () => {
    const onAdjust = jest.fn();
    const state = hotel([emp({ raiseRequested: true })]);
    renderPanel({ hotelState: state, onAdjust });
    fireEvent.click(screen.getByRole("button", { name: /augmenter/i }));
    const next = applied(onAdjust, state).staffRoster[0];
    expect(next.dailySalary).toBe(Math.round(emp().dailySalary * 1.1));
    expect(next.raiseRequested).toBe(false);
  });

  it("'Refuser la demande' only appears with a pending request, and settles it", () => {
    const onAdjust = jest.fn();
    const first = renderPanel({ hotelState: hotel([emp()]), onAdjust });
    expect(screen.queryByRole("button", { name: /refuser la demande/i })).not.toBeInTheDocument();
    first.unmount();

    const state = hotel([emp({ raiseRequested: true })]);
    renderPanel({ hotelState: state, onAdjust });
    fireEvent.click(screen.getByRole("button", { name: /refuser la demande/i }));
    expect(applied(onAdjust, state).staffRoster[0].raiseRequested).toBe(false);
  });

  it("disables the bonus and raise buttons during their cooldown", () => {
    renderPanel({ hotelState: hotel([emp({ lastBonusDay: 3, lastRaiseDay: 2 })]) }); // day 5
    expect(screen.getByRole("button", { name: /^prime/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /augmenter/i })).toBeDisabled();
  });

  it("enables them again once the cooldown has passed", () => {
    renderPanel({ hotelState: hotel([emp({ lastBonusDay: -10, lastRaiseDay: -20 })]) });
    expect(screen.getByRole("button", { name: /^prime/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /augmenter/i })).toBeEnabled();
  });

  it("disables them while a save is running", () => {
    renderPanel({ hotelState: hotel([emp()]), isRunning: true });
    expect(screen.getByRole("button", { name: /^prime/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /augmenter/i })).toBeDisabled();
  });
});
