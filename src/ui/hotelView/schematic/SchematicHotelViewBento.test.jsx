import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchematicHotelView from "./SchematicHotelView";

const rooms = [
  { id: 1, number: "101", type: "standard", status: "occupée", housekeeping_status: "clean", price: 120, capacity: 2 },
  { id: 2, number: "102", type: "standard", status: "libre", housekeeping_status: "dirty", price: 120, capacity: 2 },
  { id: 3, number: "103", type: "standard", status: "libre", housekeeping_status: "clean", price: 120, capacity: 2 },
  { id: 4, number: "104", type: "standard", status: "maintenance", housekeeping_status: "clean", price: 120, capacity: 2 },
  { id: 9, number: "S01", type: "seminar", status: "libre", housekeeping_status: "clean", price: 450, capacity: 20 },
];
const hotelState = { finance: { revenue: [1000], costs: [0] }, mice: { requests: [], events: [], nextId: 1, lastOutcome: null } };
const vipGuest = { reservationId: 7, guestName: "Client 7", roomId: 1, roomNumber: "101", followers: 120000, departure: "2026-09-20" };

const view = (props = {}) =>
  render(
    <MemoryRouter>
      <SchematicHotelView rooms={rooms} staffCount={1} diagnostics={[]} decisionFeedback={null} cleaningRoomIds={new Set()} hotelState={hotelState} date={new Date("2026-09-14T12:00:00Z")} {...props} />
    </MemoryRouter>
  );

describe("SchematicHotelView / Bento tiles", () => {
  it("draws the plan as a Bento card", () => {
    view();
    expect(screen.getByTestId("schematic-hotel-view")).toHaveClass("bento-card");
  });

  it("explains what the pastilles mean", () => {
    view();
    const legend = screen.getByRole("group", { name: /signification des pastilles/i });
    ["V.I.P.", "Panne", "Ménage", "Salle MICE"].forEach((label) => expect(within(legend).getByText(label)).toBeInTheDocument());
  });

  it.each([
    ["101", "action"], // occupied
    ["103", "success"], // free and clean
    ["102", "vip"], // to clean
    ["104", "danger"], // out of service
    ["S01", "mice"], // meeting room
  ])("room %s wears the %s tone", (number, tone) => {
    view();
    const tile = screen.getByTestId(`schematic-room-${number}`);
    expect(tile).toHaveClass("plan-tile");
    expect(tile).toHaveAttribute("data-tone", tone);
  });

  it("a room being cleaned takes the cleaning tone", () => {
    view({ cleaningRoomIds: new Set([3]) });
    expect(screen.getByTestId("schematic-room-103")).toHaveAttribute("data-tone", "mice");
  });

  it("tiles keep the accessible name and status they always had", () => {
    view();
    expect(screen.getByTestId("schematic-room-101")).toHaveAccessibleName("Chambre 101, Occupée");
    expect(screen.getByTestId("schematic-room-101")).toHaveAttribute("data-status", "occupied");
  });

  it("a dirty room carries a 🧹 badge that opens the direct action", () => {
    view();
    const badge = screen.getByTestId("schematic-room-102-alert");
    expect(badge).toHaveClass("plan-badge");
    expect(badge).toHaveTextContent("🧹");
    expect(badge).toHaveAttribute("data-tone", "vip");
  });

  it("a clean room has no alert badge", () => {
    view();
    expect(screen.queryByTestId("schematic-room-103-alert")).not.toBeInTheDocument();
  });

  it("a room out of service carries a 🔧 badge", () => {
    view();
    expect(screen.getByTestId("schematic-room-104-out")).toHaveTextContent("🔧");
    expect(screen.queryByTestId("schematic-room-103-out")).not.toBeInTheDocument();
  });

  it("the meeting room carries a 💼 badge, dimmed while free", () => {
    view();
    const badge = screen.getByTestId("schematic-room-S01-mice");
    expect(badge).toHaveTextContent("💼");
    expect(badge).toHaveAttribute("data-busy", "false");
    expect(badge).toHaveAttribute("title", "Salle MICE libre");
    expect(badge).toHaveClass("opacity-60");
  });

  it("the badge of a meeting room in use says it is busy", () => {
    view({ rooms: rooms.map((room) => (room.id === 9 ? { ...room, status: "occupée" } : room)) });
    const badge = screen.getByTestId("schematic-room-S01-mice");
    expect(badge).toHaveAttribute("data-busy", "true");
    expect(badge).toHaveAttribute("title", "Salle MICE occupée");
    expect(badge).not.toHaveClass("opacity-60");
  });

  it("an ordinary room has no MICE badge", () => {
    view();
    expect(screen.queryByTestId("schematic-room-101-mice")).not.toBeInTheDocument();
  });

  it("a V.I.P.'s room carries a ⭐ badge, still a button", () => {
    view({ vipGuests: [vipGuest], reservations: [] });
    const badge = screen.getByTestId("schematic-room-101-vip");
    expect(badge).toHaveTextContent("⭐");
    expect(badge).toHaveClass("plan-badge");
    expect(badge.tagName).toBe("BUTTON");
  });

  it("the ground-floor zones are tiles too, with a 🔧 badge on an open breakdown", () => {
    view({ activeIncidents: [{ id: "i1", zone: "laundry", status: "active", severity: "critical", message: "Panne machine à laver", repairCost: 300 }] });
    expect(screen.getByTestId("schematic-amenity-reception")).toHaveClass("plan-tile");
    const badge = screen.getByTestId("schematic-amenity-laundry-alert");
    expect(badge).toHaveTextContent("🔧");
    expect(badge).toHaveAttribute("data-severity", "critical");
    expect(badge).toHaveAttribute("data-tone", "danger");
  });

  it("a breakdown under repair shows 🛠️ instead", () => {
    view({ activeIncidents: [{ id: "i1", zone: "laundry", status: "repairing", severity: "minor", message: "x", repairCost: 100, repairEtaDay: 3 }] });
    expect(screen.getByTestId("schematic-amenity-laundry-alert")).toHaveTextContent("🛠️");
  });

  it("the V.I.P. alert panel is tinted and its button is a soft button", () => {
    view({ vipGuests: [vipGuest], reservations: [] });
    expect(screen.getByTestId("schematic-vip-alert")).toHaveAttribute("data-tone", "vip");
    expect(screen.getByTestId("schematic-vip-welcome-7")).toHaveClass("btn-soft-primary");
  });

  it("the zone chips and the seminar chip are soft buttons of their own tone", () => {
    view();
    expect(screen.getByTestId("schematic-mice")).toHaveAttribute("data-tone", "mice");
    expect(screen.getByTestId("schematic-expansion")).toHaveAttribute("data-tone", "success");
    expect(screen.getByTestId("schematic-zone-rooms")).toHaveClass("btn-soft-primary");
  });
});
