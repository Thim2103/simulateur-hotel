import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchematicHotelView from "./SchematicHotelView";

const rooms = [
  { id: 1, number: "101", status: "occupée", housekeeping_status: "clean" },
  { id: 2, number: "102", status: "libre", housekeeping_status: "clean" },
];
const vipGuest = (extra = {}) => ({ reservationId: 7, guestName: "Client 7", roomId: 1, roomNumber: "101", followers: 120000, departure: "2026-09-14", ...extra });

const renderView = (props = {}) =>
  render(
    <MemoryRouter>
      <SchematicHotelView rooms={rooms} staffCount={1} diagnostics={[]} decisionFeedback={null} cleaningRoomIds={new Set()} {...props} />
    </MemoryRouter>
  );

describe("SchematicHotelView / V.I.P. alert", () => {
  it("shows nothing when no V.I.P. is in the hotel (existing callers are unaffected)", () => {
    renderView();
    expect(screen.queryByTestId("schematic-vip-alert")).not.toBeInTheDocument();
    expect(screen.queryByTestId("schematic-amenity-reception-vip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("schematic-room-101-vip")).not.toBeInTheDocument();
  });

  it("names the V.I.P., their room, their audience and departure, and warns of the triple weight", () => {
    renderView({ vipGuests: [vipGuest()] });
    const alert = screen.getByTestId("schematic-vip-alert");
    expect(alert).toHaveAttribute("role", "status");
    expect(alert).toHaveTextContent(/v\.i\.p\. en séjour/i);
    expect(alert).toHaveTextContent("Client 7");
    expect(alert).toHaveTextContent("chambre 101");
    expect(alert.textContent.replace(/\s| | /g, "")).toContain("120000abonnés");
    expect(alert).toHaveTextContent("2026-09-14");
    expect(alert).toHaveTextContent("×3");
  });

  it("flags the V.I.P.'s room, and only theirs", () => {
    renderView({ vipGuests: [vipGuest()] });
    expect(screen.getByTestId("schematic-room-101-vip")).toHaveAccessibleName(/v\.i\.p\. dans la chambre 101/i);
    expect(screen.queryByTestId("schematic-room-102-vip")).not.toBeInTheDocument();
  });

  it("flags the reception too, where the V.I.P. will be welcomed", () => {
    renderView({ vipGuests: [vipGuest()] });
    expect(screen.getByTestId("schematic-amenity-reception-vip")).toBeInTheDocument();
    expect(screen.queryByTestId("schematic-amenity-hall-vip")).not.toBeInTheDocument();
  });

  it("lists several V.I.P.s", () => {
    renderView({ vipGuests: [vipGuest(), vipGuest({ reservationId: 8, guestName: "Client 8", roomId: 2, roomNumber: "102" })] });
    expect(screen.getAllByTestId("schematic-vip-guest")).toHaveLength(2);
    expect(screen.getByTestId("schematic-room-102-vip")).toBeInTheDocument();
  });

  it("does not get in the way of the room's own click, which still navigates", () => {
    renderView({ vipGuests: [vipGuest()] });
    const cell = screen.getByTestId("schematic-room-101");
    expect(within(cell.parentElement).getByTestId("schematic-room-101-vip")).toBeInTheDocument();
    expect(cell).toBeEnabled();
  });
});
