import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchematicHotelView from "./SchematicHotelView";

const DAY = 86400000;
const NOW = new Date("2026-09-14T12:00:00Z");
const iso = (date) => date.toISOString().slice(0, 10);

const rooms = [
  { id: 1, number: "101", type: "standard", status: "libre", housekeeping_status: "clean", price: 120, capacity: 2 },
  { id: 9, number: "S01", type: "seminar", status: "libre", housekeeping_status: "clean", price: 450, capacity: 20 },
];
const quote = (id) => ({ id, company: `Société ${id}`, attendees: 20, days: 1, startDate: iso(new Date(NOW.getTime() + 10 * DAY)), receivedOn: iso(NOW), expiresOn: iso(new Date(NOW.getTime() + 6 * DAY)), expectedDiscount: 0.1, status: "pending" });
const hotelState = (requests = []) => ({ finance: { revenue: [10000], costs: [0] }, mice: { requests, events: [], nextId: 50, lastOutcome: null } });

const view = (props = {}) =>
  render(
    <MemoryRouter>
      <SchematicHotelView rooms={rooms} staffCount={1} diagnostics={[]} decisionFeedback={null} cleaningRoomIds={new Set()} hotelState={hotelState()} reservations={[]} date={NOW} onMiceRespond={jest.fn()} {...props} />
    </MemoryRouter>
  );

describe("SchematicHotelView / seminars and events", () => {
  it("shows no seminar chip when the hotel has no meeting room (existing callers are unaffected)", () => {
    view({ rooms: [rooms[0]] });
    expect(screen.queryByTestId("schematic-mice")).not.toBeInTheDocument();
  });

  it("shows no seminar chip without the hotel's state", () => {
    view({ hotelState: undefined });
    expect(screen.queryByTestId("schematic-mice")).not.toBeInTheDocument();
  });

  it("the chip carries the number of quotes waiting", () => {
    view({ hotelState: hotelState([quote(1), quote(2)]) });
    const chip = screen.getByTestId("schematic-mice");
    expect(chip).toHaveAttribute("data-pending", "2");
    expect(chip).toHaveAccessibleName(/séminaires et événements pro, 2 devis en attente/i);
    expect(chip).toHaveTextContent("2");
  });

  it("no count when nothing waits", () => {
    view();
    expect(screen.getByTestId("schematic-mice")).toHaveAttribute("data-pending", "0");
  });

  it("the chip opens the seminar desk", () => {
    view({ hotelState: hotelState([quote(1)]) });
    fireEvent.click(screen.getByTestId("schematic-mice"));
    expect(screen.getByRole("dialog", { name: /séminaires & événements pro/i })).toBeInTheDocument();
    expect(screen.getByTestId("mice-request-1")).toHaveTextContent("Société 1");
  });

  it("clicking the meeting room itself opens it too, instead of the rooms page", () => {
    view({ hotelState: hotelState([quote(1)]) });
    fireEvent.click(screen.getByTestId("schematic-room-S01"));
    expect(screen.getByRole("dialog", { name: /séminaires & événements pro/i })).toBeInTheDocument();
  });

  it("an ordinary room does not open it", () => {
    view();
    fireEvent.click(screen.getByTestId("schematic-room-101"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a caller's own onSelectZone takes precedence over the seminar desk", () => {
    const onSelectZone = jest.fn();
    view({ onSelectZone });
    fireEvent.click(screen.getByTestId("schematic-room-S01"));
    expect(onSelectZone).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("answering a quote calls onMiceRespond with the quote and the answer", () => {
    const onMiceRespond = jest.fn();
    view({ hotelState: hotelState([quote(1)]), onMiceRespond });
    fireEvent.click(screen.getByTestId("schematic-mice"));
    fireEvent.click(screen.getByTestId("mice-accept-1"));
    expect(onMiceRespond).toHaveBeenCalledWith(1, { type: "accept" });
  });

  it("links to the events page, and closes", () => {
    view();
    fireEvent.click(screen.getByTestId("schematic-mice"));
    expect(screen.getByRole("link", { name: /page des événements pro/i })).toHaveAttribute("href", "/corporate/events");
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
