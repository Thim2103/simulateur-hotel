import { render, screen, fireEvent, within } from "@testing-library/react";
import YieldMarketingModal from "./YieldMarketingModal";
import { launchTargetedCampaign, advanceTargetedCampaigns, CAMPAIGN_TYPES } from "../../lib/marketing/targetedCampaigns";
import { setYieldEnabled, setYieldRule } from "../../lib/rm/yieldManagementEngine";

const DATE = new Date("2026-09-14T12:00:00Z");
const DAY = 86400000;
const rich = (treasury = 50000) => ({ finance: { revenue: [treasury], costs: [0] } });
const compact = (text) => text.replace(/\s| | /g, "");

const renderModal = (hotelState = rich(), props = {}) =>
  render(
    <YieldMarketingModal
      hotelState={hotelState}
      date={DATE}
      onSetYieldEnabled={jest.fn()}
      onSetYieldRule={jest.fn()}
      onLaunchCampaign={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />
  );

describe("YieldMarketingModal / yield management", () => {
  it("shows the treasury", () => {
    renderModal(rich(12345));
    expect(compact(screen.getByTestId("growth-treasury").textContent)).toBe("12345€");
  });

  it("is off by default, with the switch in the off position", () => {
    renderModal();
    expect(screen.getByTestId("yield-toggle")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("yield-toggle")).toHaveTextContent(/désactivé/i);
  });

  it("switching it on calls onSetYieldEnabled(true)", () => {
    const onSetYieldEnabled = jest.fn();
    renderModal(rich(), { onSetYieldEnabled });
    fireEvent.click(screen.getByTestId("yield-toggle"));
    expect(onSetYieldEnabled).toHaveBeenCalledWith(true);
  });

  it("reflects a hotel where it is on, and switching calls with false", () => {
    const onSetYieldEnabled = jest.fn();
    renderModal(setYieldEnabled({ hotelState: rich() }, true).hotelState, { onSetYieldEnabled });
    expect(screen.getByTestId("yield-toggle")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByTestId("yield-toggle"));
    expect(onSetYieldEnabled).toHaveBeenCalledWith(false);
  });

  it("lists the three rules with the player's defaults spelled out", () => {
    renderModal();
    expect(screen.getByTestId("yield-rule-occupancy")).toHaveTextContent(/plus de 80 %.*\+15 %/);
    expect(screen.getByTestId("yield-rule-lastMinute")).toHaveTextContent(/moins de 40 %.*2 jour.*−20 %/);
    expect(screen.getByTestId("yield-rule-events")).toHaveTextContent(/festival.*haute saison.*\+10 %/i);
  });

  it("shows the configured values in the fields", () => {
    const state = setYieldRule({ hotelState: rich() }, "occupancy", { threshold: 70, adjustment: 0.25 }).hotelState;
    renderModal(state);
    expect(screen.getByTestId("yield-rule-occupancy-threshold")).toHaveValue(70);
    expect(screen.getByTestId("yield-rule-occupancy-adjustment")).toHaveValue(25);
    expect(screen.getByTestId("yield-rule-occupancy")).toHaveTextContent(/plus de 70 %.*\+25 %/);
  });

  it("a rule can be switched off", () => {
    const onSetYieldRule = jest.fn();
    renderModal(rich(), { onSetYieldRule });
    fireEvent.click(screen.getByTestId("yield-rule-events-enabled"));
    expect(onSetYieldRule).toHaveBeenCalledWith("events", { enabled: false });
  });

  it("a number typed in a field is committed when the player leaves it, not on every keystroke", () => {
    const onSetYieldRule = jest.fn();
    renderModal(rich(), { onSetYieldRule });
    const field = screen.getByTestId("yield-rule-occupancy-threshold");
    fireEvent.change(field, { target: { value: "7" } });
    fireEvent.change(field, { target: { value: "75" } });
    expect(onSetYieldRule).not.toHaveBeenCalled();
    fireEvent.blur(field);
    expect(onSetYieldRule).toHaveBeenCalledTimes(1);
    expect(onSetYieldRule).toHaveBeenCalledWith("occupancy", { threshold: 75 });
  });

  it("also on Enter", () => {
    const onSetYieldRule = jest.fn();
    renderModal(rich(), { onSetYieldRule });
    const field = screen.getByTestId("yield-rule-lastMinute-daysAhead");
    fireEvent.change(field, { target: { value: "3" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSetYieldRule).toHaveBeenCalledWith("lastMinute", { daysAhead: 3 });
  });

  it("the adjustment is entered in percent and committed as a fraction", () => {
    const onSetYieldRule = jest.fn();
    renderModal(rich(), { onSetYieldRule });
    const field = screen.getByTestId("yield-rule-occupancy-adjustment");
    fireEvent.change(field, { target: { value: "20" } });
    fireEvent.blur(field);
    expect(onSetYieldRule).toHaveBeenCalledWith("occupancy", { adjustment: 0.2 });
  });

  it("leaving a field unchanged commits nothing", () => {
    const onSetYieldRule = jest.fn();
    renderModal(rich(), { onSetYieldRule });
    fireEvent.blur(screen.getByTestId("yield-rule-occupancy-threshold"));
    expect(onSetYieldRule).not.toHaveBeenCalled();
  });

  it("a nonsense entry is not committed", () => {
    const onSetYieldRule = jest.fn();
    renderModal(rich(), { onSetYieldRule });
    const field = screen.getByTestId("yield-rule-occupancy-threshold");
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);
    expect(onSetYieldRule).not.toHaveBeenCalled();
  });

  it("the events rule has an adjustment only, no threshold", () => {
    renderModal();
    expect(screen.queryByTestId("yield-rule-events-threshold")).not.toBeInTheDocument();
    expect(screen.getByTestId("yield-rule-events-adjustment")).toBeInTheDocument();
  });
});

describe("YieldMarketingModal / campaigns", () => {
  it("offers the three kinds with their target, cost and duration", () => {
    renderModal();
    Object.values(CAMPAIGN_TYPES).forEach((type) => {
      const card = screen.getByTestId(`campaign-${type.id}`);
      expect(card).toHaveTextContent(type.name);
      expect(compact(card.textContent)).toContain(`${type.cost}€`);
      expect(card).toHaveTextContent(`${type.durationDays} jours`);
      expect(card).toHaveTextContent(type.target);
    });
  });

  it("an affordable campaign can be launched", () => {
    const onLaunchCampaign = jest.fn();
    renderModal(rich(), { onLaunchCampaign });
    expect(screen.getByTestId("campaign-digital")).toHaveAttribute("data-status", "available");
    fireEvent.click(screen.getByTestId("campaign-digital-launch"));
    expect(onLaunchCampaign).toHaveBeenCalledWith("digital");
  });

  it("one the treasury can't cover is disabled, with the reason", () => {
    renderModal(rich(3000));
    expect(screen.getByTestId("campaign-corporate-launch")).toBeDisabled();
    expect(screen.getByTestId("campaign-corporate-status")).toHaveTextContent(/trésorerie insuffisante/i);
    expect(screen.getByTestId("campaign-digital-launch")).toBeEnabled();
  });

  it("a kind already running is disabled, and shown with its days left and return so far", () => {
    const launched = launchTargetedCampaign({ hotelState: rich() }, "digital", { date: DATE }).hotelState;
    const state = advanceTargetedCampaigns(launched, { date: DATE, demandReport: { newBookings: 22, newBookingsValue: 2200 } });
    renderModal(state);
    expect(screen.getByTestId("campaign-digital-launch")).toBeDisabled();
    expect(screen.getByTestId("campaign-digital-status")).toHaveTextContent(/déjà en cours/i);
    const running = screen.getByTestId("campaign-running-digital");
    expect(running).toHaveTextContent(/7 jour\(s\) restant\(s\)/);
    expect(running).toHaveTextContent(/2 réservation\(s\) supplémentaire\(s\)/);
    expect(compact(running.textContent)).toContain("2500€investis");
  });

  it("finished campaigns are listed with their ROI", () => {
    let state = launchTargetedCampaign({ hotelState: rich() }, "digital", { date: DATE }).hotelState;
    for (let i = 0; i < 7; i += 1) state = advanceTargetedCampaigns(state, { date: new Date(DATE.getTime() + i * DAY), demandReport: { newBookings: 110, newBookingsValue: 27500 } });
    renderModal(state);
    const history = within(screen.getByTestId("campaigns-history"));
    expect(history.getByTestId("campaign-history-digital")).toHaveTextContent(/roi \+\d+ %/i);
    expect(screen.queryByTestId("campaigns-running")).not.toBeInTheDocument();
    expect(screen.getByTestId("campaign-digital-launch")).toBeEnabled();
  });

  it("a losing campaign shows a negative ROI", () => {
    let state = launchTargetedCampaign({ hotelState: rich() }, "digital", { date: DATE }).hotelState;
    for (let i = 0; i < 7; i += 1) state = advanceTargetedCampaigns(state, { date: new Date(DATE.getTime() + i * DAY), demandReport: { newBookings: 0, newBookingsValue: 0 } });
    renderModal(state);
    expect(screen.getByTestId("campaign-history-digital")).toHaveTextContent("ROI −100 %");
  });

  it("no running or history block for a hotel that never launched one", () => {
    renderModal();
    expect(screen.queryByTestId("campaigns-running")).not.toBeInTheDocument();
    expect(screen.queryByTestId("campaigns-history")).not.toBeInTheDocument();
  });
});

describe("YieldMarketingModal / closing", () => {
  it("closes through its close button", () => {
    const onClose = jest.fn();
    renderModal(rich(), { onClose });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
