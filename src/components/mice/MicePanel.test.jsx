import { render, screen, fireEvent, within } from "@testing-library/react";
import MicePanel from "./MicePanel";
import { respondToRequest, conversionChance, STANDARD_DISCOUNT } from "../../lib/mice/miceEngine";
import { mixedRandom } from "../../lib/clients/guestProfiles";
import { toIsoDate } from "../../lib/hotelEvents/hotelEventsEngine";

const DAY = 86400000;
const NOW = new Date("2026-09-14T12:00:00Z");
const plus = (date, days) => new Date(date.getTime() + days * DAY);
const iso = (date) => toIsoDate(date);
const compact = (text) => text.replace(/\s| | /g, "");

const room = (id, number, type, extra = {}) => ({ id, number, type, price: 120, status: "libre", capacity: 2, ...extra });
const rooms = [room(1, "101", "standard"), room(2, "102", "standard"), room(3, "201", "deluxe", { price: 180 }), room(4, "202", "deluxe", { price: 180 }), room(9, "S01", "seminar", { price: 450, capacity: 20 })];
const request = (id, extra = {}) => ({ id, company: "Novatek Solutions", attendees: 20, days: 2, startDate: iso(plus(NOW, 10)), receivedOn: iso(NOW), expiresOn: iso(plus(NOW, 6)), expectedDiscount: 0.1, status: "pending", ...extra });
const state = (requests = [], extra = {}) => ({ finance: { revenue: [10000], costs: [0] }, mice: { requests, events: [], nextId: 100, lastOutcome: null, ...extra } });

function renderPanel(hotelState, props = {}) {
  return render(<MicePanel hotelState={hotelState} rooms={rooms} reservations={[]} date={NOW} onRespond={jest.fn()} {...props} />);
}

describe("MicePanel / the quotes", () => {
  it("says what to do when the hotel has no meeting room", () => {
    render(<MicePanel hotelState={state()} rooms={rooms.slice(0, 4)} reservations={[]} date={NOW} onRespond={jest.fn()} />);
    expect(screen.getByTestId("mice-no-room")).toHaveTextContent(/aucune salle de réunion.*aménagez-en une/i);
  });

  it("says so when no quote is waiting", () => {
    renderPanel(state());
    expect(screen.getByTestId("mice-none")).toBeInTheDocument();
    expect(screen.getByTestId("mice-pending-count")).toHaveTextContent("0 devis en attente");
    expect(screen.getByTestId("mice-forecast")).toHaveTextContent("0 €");
  });

  it("shows each pending quote with the group, the dates, what it needs and the list price", () => {
    renderPanel(state([request(1)]));
    const card = screen.getByTestId("mice-request-1");
    expect(card).toHaveTextContent("Novatek Solutions");
    expect(card).toHaveTextContent("20 personnes, 2 jours");
    expect(card).toHaveTextContent("salle S01");
    expect(card).toHaveTextContent("4 chambre(s) Standard/Deluxe");
    expect(card).toHaveTextContent(/dans 10 jours/);
    expect(card).toHaveTextContent("Expire dans 6 j");
    const rack = compact(screen.getByTestId("mice-rack-1").textContent);
    expect(rack).toContain("900€"); // the meeting room, two days
    expect(rack).toContain("1800€"); // catering, 20 people, two days
    expect(screen.getByTestId("mice-pending-count")).toHaveTextContent("1 devis en attente");
  });

  it("a one-day event has no accommodation", () => {
    renderPanel(state([request(1, { days: 1 })]));
    expect(screen.getByTestId("mice-request-1")).toHaveTextContent("sans hébergement");
    expect(screen.getByTestId("mice-rack-1")).not.toHaveTextContent(/hébergement/);
  });

  it("orders the quotes by start date", () => {
    renderPanel(state([request(1, { startDate: iso(plus(NOW, 15)) }), request(2, { startDate: iso(plus(NOW, 9)) })]));
    const ids = screen.getAllByTestId(/^mice-request-\d+$/).map((item) => item.getAttribute("data-testid"));
    expect(ids).toEqual(["mice-request-2", "mice-request-1"]);
  });

  it("does not show quotes that expired or already started", () => {
    renderPanel(state([request(1, { expiresOn: iso(plus(NOW, -1)) }), request(2, { startDate: iso(NOW) }), request(3, { status: "declined" })]));
    expect(screen.getByTestId("mice-none")).toBeInTheDocument();
  });
});

describe("MicePanel / answering", () => {
  it("accepting at the standard rate calls onRespond, with the guaranteed total on the button", () => {
    const onRespond = jest.fn();
    renderPanel(state([request(1)]), { onRespond });
    const accept = screen.getByTestId("mice-accept-1");
    expect(accept).toHaveTextContent("Accepter (−10 %)");
    fireEvent.click(accept);
    expect(onRespond).toHaveBeenCalledWith(1, { type: "accept" });
  });

  it("negotiating sends the discount typed, kept within 0 to 30 %", () => {
    const onRespond = jest.fn();
    renderPanel(state([request(1)]), { onRespond });
    fireEvent.change(screen.getByTestId("mice-discount-1"), { target: { value: "18" } });
    fireEvent.click(screen.getByTestId("mice-negotiate-1"));
    expect(onRespond).toHaveBeenCalledWith(1, { type: "negotiate", discount: 0.18 });
  });

  it("a discount beyond the limit is brought back to 30 %", () => {
    const onRespond = jest.fn();
    renderPanel(state([request(1)]), { onRespond });
    fireEvent.change(screen.getByTestId("mice-discount-1"), { target: { value: "80" } });
    fireEvent.click(screen.getByTestId("mice-negotiate-1"));
    expect(onRespond).toHaveBeenCalledWith(1, { type: "negotiate", discount: 0.3 });
  });

  it("declining calls onRespond with a decline", () => {
    const onRespond = jest.fn();
    renderPanel(state([request(1)]), { onRespond });
    fireEvent.click(screen.getByTestId("mice-decline-1"));
    expect(onRespond).toHaveBeenCalledWith(1, { type: "decline" });
  });

  it("answers only once, however the buttons are clicked", () => {
    const onRespond = jest.fn();
    renderPanel(state([request(1)]), { onRespond });
    fireEvent.click(screen.getByTestId("mice-accept-1"));
    fireEvent.click(screen.getByTestId("mice-accept-1"));
    fireEvent.click(screen.getByTestId("mice-decline-1"));
    expect(onRespond).toHaveBeenCalledTimes(1);
  });

  it("shows the chance of signing and the guaranteed revenue at the discount offered, and they follow the discount", () => {
    renderPanel(state([request(1, { expectedDiscount: 0.12 })]));
    const at = () => screen.getByTestId("mice-chance-1").textContent;
    expect(at()).toContain("À 10 % de remise");
    expect(at()).toMatch(/moyenne|bonne/);
    const before = compact(at());
    fireEvent.change(screen.getByTestId("mice-discount-1"), { target: { value: "25" } });
    expect(at()).toContain("À 25 % de remise");
    expect(at()).toMatch(/bonne \(≈ 95 %\)/);
    expect(compact(at())).not.toBe(before);
    fireEvent.change(screen.getByTestId("mice-discount-1"), { target: { value: "0" } });
    expect(at()).toMatch(/faible/);
  });

  it("an empty discount field falls back to the standard rate", () => {
    renderPanel(state([request(1)]));
    fireEvent.change(screen.getByTestId("mice-discount-1"), { target: { value: "" } });
    expect(screen.getByTestId("mice-chance-1")).toHaveTextContent("À 10 % de remise");
  });

  it("a group the hotel can't host is explained and can't be accepted", () => {
    renderPanel(state([request(1, { attendees: 100 })]));
    expect(screen.getByTestId("mice-request-1")).toHaveAttribute("data-feasible", "false");
    expect(screen.getByTestId("mice-reason-1")).toHaveTextContent(/impossible à accueillir.*aucune salle assez grande.*20 personnes/i);
    expect(screen.getByTestId("mice-accept-1")).toBeDisabled();
    expect(screen.getByTestId("mice-negotiate-1")).toBeDisabled();
    expect(screen.getByTestId("mice-decline-1")).toBeEnabled();
  });

  it("not enough free bedrooms is explained with the numbers", () => {
    render(<MicePanel hotelState={state([request(1)])} rooms={[rooms[0], rooms[4]]} reservations={[]} date={NOW} onRespond={jest.fn()} />);
    expect(screen.getByTestId("mice-reason-1")).toHaveTextContent(/seulement 1 chambre\(s\) libre\(s\) pour les 4 nécessaires/i);
  });
});

describe("MicePanel / what came of it", () => {
  const id = Array.from({ length: 4000 }, (_, i) => i + 1).find((n) => mixedRandom(`mice-decision:${n}:10`) < conversionChance(request(n), STANDARD_DISCOUNT));
  const lost = Array.from({ length: 4000 }, (_, i) => i + 1).find((n) => !(mixedRandom(`mice-decision:${n}:10`) < conversionChance(request(n), STANDARD_DISCOUNT)));
  const answered = (requestId, type) => respondToRequest({ hotelState: state([request(requestId)]), rooms, reservations: [] }, requestId, { type }, { day: 3, date: NOW });

  it("a signed contract shows its guaranteed total and the event", () => {
    const result = answered(id, "accept");
    renderPanel(result.hotelState, { reservations: result.reservations });
    expect(screen.getByTestId("mice-outcome")).toHaveAttribute("data-outcome", "signed");
    expect(screen.getByTestId("mice-outcome")).toHaveTextContent(/contrat signé.*garantis/i);
    expect(screen.getByTestId(`mice-event-${id}`)).toHaveTextContent(/Novatek Solutions.*20 personnes.*salle S01/);
    expect(screen.getByTestId("mice-forecast")).not.toHaveTextContent(/garanti : 0 €/);
  });

  it("a lost client says so", () => {
    const result = answered(lost, "accept");
    renderPanel(result.hotelState, { reservations: result.reservations });
    expect(screen.getByTestId("mice-outcome")).toHaveAttribute("data-outcome", "lost");
    expect(screen.getByTestId("mice-outcome")).toHaveTextContent(/autre hôtel/i);
  });

  it("a declined quote is acknowledged", () => {
    const result = answered(id, "decline");
    renderPanel(result.hotelState);
    expect(screen.getByTestId("mice-outcome")).toHaveAttribute("data-outcome", "declined");
  });

  it("no outcome banner before any answer", () => {
    renderPanel(state([request(1)]));
    expect(screen.queryByTestId("mice-outcome")).not.toBeInTheDocument();
  });

  it("lists the events that are over", () => {
    const done = { id: 7, company: "Pharma Sud", attendees: 40, days: 1, startDate: "2026-09-01", endDate: "2026-09-01", status: "done", quote: { total: 4000 }, meetingRoomNumber: "S01" };
    renderPanel(state([], { events: [done] }));
    expect(screen.getByTestId("mice-done-7")).toHaveTextContent(/Pharma Sud.*40 personnes/);
  });
});

describe("MicePanel / the meeting rooms' calendar", () => {
  it("shows the next four weeks of each meeting room, free by default", () => {
    renderPanel(state());
    const strip = within(screen.getByTestId("mice-calendar-9"));
    expect(strip.getAllByTestId(/^mice-cal-9-/)).toHaveLength(28);
    expect(strip.getAllByTestId(/^mice-cal-9-/).every((cell) => cell.getAttribute("data-busy") === "free")).toBe(true);
  });

  it("marks the days a signed event holds the room, and other bookings", () => {
    const start = iso(plus(NOW, 3));
    const event = { id: 5, company: "Novatek", attendees: 20, days: 2, startDate: start, endDate: iso(plus(NOW, 4)), status: "confirmed", quote: { total: 3000 }, meetingRoomId: 9, meetingRoomNumber: "S01" };
    const other = [{ id: 1, room_id: 9, status: "confirmée", arrival: iso(plus(NOW, 8)), departure: iso(plus(NOW, 9)) }];
    renderPanel(state([], { events: [event] }), { reservations: other });
    expect(screen.getByTestId(`mice-cal-9-${start}`)).toHaveAttribute("data-busy", "event");
    expect(screen.getByTestId(`mice-cal-9-${iso(plus(NOW, 4))}`)).toHaveAttribute("data-busy", "event");
    expect(screen.getByTestId(`mice-cal-9-${iso(plus(NOW, 5))}`)).toHaveAttribute("data-busy", "free");
    expect(screen.getByTestId(`mice-cal-9-${iso(plus(NOW, 8))}`)).toHaveAttribute("data-busy", "other");
  });

  it("no calendar without a meeting room", () => {
    render(<MicePanel hotelState={state()} rooms={rooms.slice(0, 4)} reservations={[]} date={NOW} onRespond={jest.fn()} />);
    expect(screen.queryByText(/occupation des salles/i)).not.toBeInTheDocument();
  });
});
