import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchematicHotelView from "./SchematicHotelView";
import { isVip, mixedRandom, UNLUCKY_STAY_CHANCE } from "../../../lib/clients/guestProfiles";
import { describeVipGuests } from "../../../lib/clients/vipServiceEngine";

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

describe("SchematicHotelView / V.I.P. welcome modal", () => {

  const roomList = [
    { id: 1, number: "101", type: "standard", status: "occupée", housekeeping_status: "clean" },
    { id: 2, number: "301", type: "suite", status: "libre", housekeeping_status: "clean" },
  ];
  const stay = (id) => ({ id, room_id: 1, room: "101", room_type: "standard", client_name: `Client ${id}`, arrival: "2026-09-10", departure: "2026-09-13", status: "confirmée", segment: "leisure", price: 120 });
  const VIP = Array.from({ length: 6000 }, (_, i) => i + 1).find((id) => isVip(stay(id), roomList[0]) && mixedRandom(`unlucky:${id}`) >= UNLUCKY_STAY_CHANCE);
  const date = new Date("2026-09-11T12:00:00Z");
  const hotelState = { finance: { revenue: [10000], costs: [0] } };
  const vipGuests = describeVipGuests({ hotelState, reservations: [stay(VIP)], rooms: roomList, date });

  const view = (props = {}) =>
    render(
      <MemoryRouter>
        <SchematicHotelView
          rooms={roomList}
          staffCount={1}
          diagnostics={[]}
          decisionFeedback={null}
          cleaningRoomIds={new Set()}
          hotelState={hotelState}
          reservations={[stay(VIP)]}
          date={date}
          vipGuests={vipGuests}
          onVipAction={jest.fn()}
          {...props}
        />
      </MemoryRouter>
    );

  it("the alert shows the guest's satisfaction and a way to welcome them", () => {
    view();
    expect(screen.getByTestId(`schematic-vip-satisfaction-${VIP}`)).toHaveTextContent(/satisfaction : \d+\/100/i);
    expect(screen.getByTestId(`schematic-vip-welcome-${VIP}`)).toHaveTextContent(/accueillir/i);
  });

  it("the star badge on the V.I.P.'s room opens the welcome modal", () => {
    view();
    fireEvent.click(screen.getByTestId("schematic-room-101-vip"));
    expect(screen.getByRole("dialog", { name: /accueil v\.i\.p\./i })).toBeInTheDocument();
    expect(screen.getByTestId("vip-profile")).toHaveTextContent(`Client ${VIP}`);
  });

  it("so does the occupied room itself", () => {
    view();
    fireEvent.click(screen.getByTestId("schematic-room-101"));
    expect(screen.getByRole("dialog", { name: /accueil v\.i\.p\./i })).toBeInTheDocument();
  });

  it("so does the reception badge and the alert's own button", () => {
    const { unmount } = view();
    fireEvent.click(screen.getByTestId("schematic-amenity-reception-vip"));
    expect(screen.getByRole("dialog", { name: /accueil v\.i\.p\./i })).toBeInTheDocument();
    unmount();
    view();
    fireEvent.click(screen.getByTestId(`schematic-vip-welcome-${VIP}`));
    expect(screen.getByRole("dialog", { name: /accueil v\.i\.p\./i })).toBeInTheDocument();
  });

  it("another room still navigates to its page", () => {
    view();
    fireEvent.click(screen.getByTestId("schematic-room-301"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("giving an attention calls onVipAction with the reservation and the attention", () => {
    const onVipAction = jest.fn();
    view({ onVipAction });
    fireEvent.click(screen.getByTestId("schematic-room-101-vip"));
    fireEvent.click(screen.getByTestId("vip-give-gift:champagne"));
    expect(onVipAction).toHaveBeenCalledWith(VIP, { type: "gift", giftId: "champagne" });
  });

  it("closing the modal removes it", () => {
    view();
    fireEvent.click(screen.getByTestId("schematic-room-101-vip"));
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("without the hotel's state there is nothing to act on: the room keeps navigating", () => {
    view({ hotelState: undefined });
    expect(screen.queryByTestId(`schematic-vip-welcome-${VIP}`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("schematic-room-101"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a caller's own onSelectZone still takes precedence over the V.I.P. modal", () => {
    const onSelectZone = jest.fn();
    view({ onSelectZone });
    fireEvent.click(screen.getByTestId("schematic-room-101"));
    expect(onSelectZone).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
