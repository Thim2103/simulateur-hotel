import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VipActionModal from "./VipActionModal";
import MiceBookingModal from "./MiceBookingModal";
import YieldMarketingModal from "../../../components/dashboard/YieldMarketingModal";
import MicePanel from "../../../components/mice/MicePanel";
import { isVip, mixedRandom, UNLUCKY_STAY_CHANCE } from "../../../lib/clients/guestProfiles";
import { CAMPAIGN_TYPES } from "../../../lib/marketing/targetedCampaigns";

const DAY = 86400000;
const NOW = new Date("2026-09-14T12:00:00Z");
const iso = (date) => date.toISOString().slice(0, 10);

const stay = (id) => ({ id, room_id: 1, room: "101", room_type: "standard", client_name: `Client ${id}`, arrival: "2026-09-13", departure: "2026-09-16", status: "confirmée", segment: "leisure", price: 120 });
const vipRooms = [{ id: 1, number: "101", type: "standard", status: "occupée" }, { id: 2, number: "301", type: "suite", status: "libre" }];
const VIP = Array.from({ length: 6000 }, (_, i) => i + 1).find((id) => isVip(stay(id), vipRooms[0]) && mixedRandom(`unlucky:${id}`) >= UNLUCKY_STAY_CHANCE);
const rich = (extra = {}) => ({ finance: { revenue: [50000], costs: [0] }, ...extra });

const miceRooms = [
  { id: 1, number: "101", type: "standard", price: 120, status: "libre", capacity: 2 },
  { id: 2, number: "102", type: "standard", price: 120, status: "libre", capacity: 2 },
  { id: 3, number: "201", type: "deluxe", price: 180, status: "libre", capacity: 3 },
  { id: 4, number: "202", type: "deluxe", price: 180, status: "libre", capacity: 3 },
  { id: 9, number: "S01", type: "seminar", price: 450, status: "libre", capacity: 20 },
];
const quote = (id) => ({ id, company: "Novatek Solutions", attendees: 20, days: 2, startDate: iso(new Date(NOW.getTime() + 10 * DAY)), receivedOn: iso(NOW), expiresOn: iso(new Date(NOW.getTime() + 6 * DAY)), expectedDiscount: 0.1, status: "pending" });
const miceState = (requests = []) => ({ finance: { revenue: [10000], costs: [0] }, mice: { requests, events: [], nextId: 100, lastOutcome: null } });

describe("V.I.P. welcome modal", () => {
  const renderVip = (hotelState = rich(), props = {}) =>
    render(
      <MemoryRouter>
        <VipActionModal reservationId={VIP} hotelState={hotelState} reservations={[stay(VIP)]} rooms={vipRooms} date={NOW} onAct={jest.fn()} onClose={jest.fn()} {...props} />
      </MemoryRouter>
    );

  it("carries the V.I.P. tone on the dialog and the profile", () => {
    renderVip();
    expect(screen.getByRole("dialog", { name: /accueil v\.i\.p\./i }).firstChild).toHaveAttribute("data-tone", "vip");
    expect(screen.getByTestId("vip-profile")).toHaveAttribute("data-tone", "vip");
  });

  it("gives the attentions as soft buttons, and the price as a badge", () => {
    renderVip();
    expect(screen.getByTestId("vip-give-upgrade")).toHaveClass("btn-soft-primary");
    expect(screen.getByTestId("vip-give-upgrade")).toHaveAttribute("data-tone", "vip");
    expect(within(screen.getByTestId("vip-option-upgrade")).getByText("Gratuit")).toHaveClass("badge-status");
  });

  it("shows each satisfaction line as a green or red badge", () => {
    renderVip(rich({ vipService: { stays: { [VIP]: { gift: { bonus: 20 } } } } }));
    const line = screen.getByTestId("vip-line-gift");
    expect(line).toHaveClass("badge-status");
    expect(line).toHaveAttribute("data-tone", "success");
  });

  it("does not let a soft button be pressed when the attention is not available", () => {
    renderVip(rich({ finance: { revenue: [10], costs: [0] } }));
    expect(screen.getByTestId("vip-give-gift:basket")).toBeDisabled();
  });
});

describe("Seminar modal", () => {
  it("carries the MICE tone", () => {
    render(
      <MemoryRouter>
        <MiceBookingModal hotelState={miceState()} rooms={miceRooms} reservations={[]} date={NOW} onRespond={jest.fn()} onClose={jest.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole("dialog", { name: /séminaires & événements pro/i }).firstChild).toHaveAttribute("data-tone", "mice");
  });

  it("tiles the guaranteed revenue and the pending count", () => {
    render(<MicePanel hotelState={miceState([quote(1)])} rooms={miceRooms} reservations={[]} date={NOW} onRespond={jest.fn()} />);
    expect(screen.getByTestId("mice-forecast")).toHaveAttribute("data-tone", "success");
    expect(screen.getByTestId("mice-pending-count")).toHaveAttribute("data-tone", "mice");
  });

  it("draws a quote as a violet-edged card with soft buttons: accept green, negotiate violet, refuse grey", () => {
    render(<MicePanel hotelState={miceState([quote(1)])} rooms={miceRooms} reservations={[]} date={NOW} onRespond={jest.fn()} />);
    expect(screen.getByTestId("mice-request-1")).toHaveAttribute("data-tone", "mice");
    expect(screen.getByTestId("mice-accept-1")).toHaveAttribute("data-tone", "success");
    expect(screen.getByTestId("mice-negotiate-1")).toHaveAttribute("data-tone", "mice");
    expect(screen.getByTestId("mice-decline-1")).toHaveAttribute("data-tone", "neutral");
    ["accept", "negotiate", "decline"].forEach((id) => expect(screen.getByTestId(`mice-${id}-1`)).toHaveClass("btn-soft-primary"));
  });

  it("colours a signed seminar's days in violet on the calendar", () => {
    const event = { id: 5, company: "Novatek", attendees: 20, days: 2, startDate: iso(new Date(NOW.getTime() + 2 * DAY)), endDate: iso(new Date(NOW.getTime() + 3 * DAY)), meetingRoomId: 9, meetingRoomNumber: "S01", status: "confirmed", quote: { total: 4000 } };
    const reservations = [{ id: 90, room_id: 9, arrival: event.startDate, departure: iso(new Date(NOW.getTime() + 4 * DAY)), status: "confirmée", source: "mice-meeting", eventId: 5 }];
    const state = miceState();
    state.mice.events = [event];
    render(<MicePanel hotelState={state} rooms={miceRooms} reservations={reservations} date={NOW} onRespond={jest.fn()} />);
    expect(screen.getByText(/violet : séminaire signé/i)).toBeInTheDocument();
    expect(screen.getByTestId(`mice-cal-9-${event.startDate}`)).toHaveClass("bg-[var(--ds-mice)]");
  });
});

describe("Yield & marketing modal", () => {
  const renderYield = (hotelState = rich(), props = {}) =>
    render(<YieldMarketingModal hotelState={hotelState} date={NOW} onSetYieldEnabled={jest.fn()} onSetYieldRule={jest.fn()} onLaunchCampaign={jest.fn()} onClose={jest.fn()} {...props} />);

  it("carries the success tone, with a tinted treasury pill", () => {
    renderYield();
    expect(screen.getByRole("dialog", { name: /yield management & marketing/i }).firstChild).toHaveAttribute("data-tone", "success");
    expect(screen.getByTestId("growth-treasury").closest("p")).toHaveAttribute("data-tone", "success");
  });

  it("makes the switch a soft button whose tone follows its state, keeping its role", () => {
    const { rerender } = renderYield();
    const off = screen.getByTestId("yield-toggle");
    expect(off).toHaveAttribute("role", "switch");
    expect(off).toHaveAttribute("data-tone", "neutral");
    rerender(<YieldMarketingModal hotelState={rich({ yieldManagement: { enabled: true } })} date={NOW} onClose={jest.fn()} />);
    expect(screen.getByTestId("yield-toggle")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("yield-toggle")).toHaveAttribute("data-tone", "success");
  });

  it("launches campaigns from soft violet buttons", () => {
    renderYield();
    Object.values(CAMPAIGN_TYPES).forEach((type) => {
      const button = screen.getByTestId(`campaign-${type.id}-launch`);
      expect(button).toHaveClass("btn-soft-primary");
      expect(button).toHaveAttribute("data-tone", "mice");
    });
  });

  it("frames the two sections with their own tone", () => {
    renderYield();
    expect(screen.getByTestId("yield-section")).toHaveAttribute("data-tone", "action");
    expect(screen.getByTestId("campaigns-section")).toHaveAttribute("data-tone", "mice");
  });
});
