import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchematicHotelView from "./SchematicHotelView";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const rooms = [{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }];
const hotel = (extra = {}) => ({ expansion: { availableCapital: 100000 }, ...extra });
const installed = (...ids) => ({ zoneUpgrades: { installed: Object.fromEntries(ids.map((id) => [id, { day: 1 }])), works: {}, completedLog: [] } });
const underWorks = (id, completesOnDay = 9) => ({ zoneUpgrades: { installed: {}, works: { [id]: { startedOnDay: 1, completesOnDay } }, completedLog: [] } });

function renderView(props = {}) {
  return render(
    <MemoryRouter>
      <SchematicHotelView rooms={rooms} staffCount={1} diagnostics={[]} decisionFeedback={null} cleaningRoomIds={new Set()} hotelState={hotel()} day={3} onStartUpgrade={jest.fn()} {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => mockNavigate.mockClear());

describe("SchematicHotelView / zone upgrades layer", () => {
  it("shows no upgrade UI at all when no hotel state is given (existing callers are unaffected)", () => {
    renderView({ hotelState: undefined });
    expect(screen.queryByTestId("schematic-zones")).not.toBeInTheDocument();
    expect(screen.queryByTestId("schematic-amenity-laundry-level")).not.toBeInTheDocument();
    expect(screen.queryByTestId("schematic-rooftop")).not.toBeInTheDocument();
  });

  it("shows a chip per zone with its level as stars", () => {
    renderView({ hotelState: hotel(installed("rooms-bedding", "rooms-domotics")) });
    const chips = within(screen.getByTestId("schematic-zones"));
    expect(chips.getAllByRole("button")).toHaveLength(5);
    const rooms = screen.getByTestId("schematic-zone-rooms");
    expect(rooms).toHaveAttribute("data-level", "2");
    expect(rooms).toHaveTextContent("⭐⭐☆");
    expect(rooms).toHaveAttribute("aria-label", "Améliorer Chambres, niveau 2 sur 3");
    expect(screen.getByTestId("schematic-zone-laundry")).toHaveTextContent("☆☆☆");
  });

  it("marks a zone under works with a badge and an accessible label", () => {
    renderView({ hotelState: hotel(underWorks("laundry-industrial")) });
    const chip = screen.getByTestId("schematic-zone-laundry");
    expect(chip).toHaveAttribute("data-works", "true");
    expect(chip).toHaveTextContent("🚧");
    expect(chip).toHaveAttribute("aria-label", expect.stringContaining("en travaux"));
    expect(screen.getByTestId("schematic-zone-rooms")).toHaveAttribute("data-works", "false");
  });

  it("puts a level indicator on each amenity cell of an upgradable zone", () => {
    renderView({ hotelState: hotel(installed("lobby-kiosk", "lobby-decor")) });
    expect(screen.getByTestId("schematic-amenity-reception-level")).toHaveTextContent("⭐⭐");
    expect(screen.getByTestId("schematic-amenity-hall-level")).toHaveTextContent("⭐⭐"); // same zone
    expect(screen.getByTestId("schematic-amenity-laundry-level")).toHaveTextContent("⬆️"); // level 0: invite to upgrade
  });

  it("an amenity under works shows the works badge instead of stars", () => {
    renderView({ hotelState: hotel(underWorks("laundry-industrial")) });
    expect(screen.getByTestId("schematic-amenity-laundry-level")).toHaveTextContent("🚧");
  });

  it("dims the room cells while the rooms are being renovated", () => {
    renderView({ hotelState: hotel(underWorks("rooms-bedding")) });
    expect(screen.getByTestId("schematic-room-101")).toHaveAttribute("data-works", "true");
  });

  it("no rooftop until the pool is built or under construction", () => {
    renderView();
    expect(screen.queryByTestId("schematic-rooftop")).not.toBeInTheDocument();
    expect(screen.getByTestId("schematic-zone-pool")).toHaveTextContent(/non construit/i);
  });

  it("the rooftop appears once the pool is built, and while it is being built", () => {
    const { unmount } = renderView({ hotelState: hotel(installed("pool-build")) });
    expect(screen.getByTestId("schematic-rooftop")).toBeInTheDocument();
    expect(screen.getByTestId("schematic-amenity-pool")).toHaveTextContent(/piscine/i);
    unmount();

    renderView({ hotelState: hotel(underWorks("pool-build")) });
    expect(screen.getByTestId("schematic-amenity-pool")).toHaveTextContent(/en travaux/i);
  });
});

describe("SchematicHotelView / opening the upgrade modal", () => {
  it("clicking a zone chip opens the modal on that zone", () => {
    renderView();
    fireEvent.click(screen.getByTestId("schematic-zone-laundry"));
    expect(screen.getByRole("dialog", { name: /buanderie/i })).toBeInTheDocument();
    expect(screen.getByTestId("upgrade-laundry-industrial")).toBeInTheDocument();
  });

  it("clicking a cell's level indicator opens its zone's modal, without navigating away", () => {
    renderView();
    fireEvent.click(screen.getByTestId("schematic-amenity-reception-level"));
    expect(screen.getByRole("dialog", { name: /réception/i })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("the block itself still navigates to its management page", () => {
    renderView();
    fireEvent.click(screen.getByTestId("schematic-amenity-reception"));
    expect(mockNavigate).toHaveBeenCalledWith("/pms");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking the rooftop opens the pool modal", () => {
    renderView({ hotelState: hotel(installed("pool-build")) });
    fireEvent.click(screen.getByTestId("schematic-amenity-pool"));
    expect(screen.getByRole("dialog", { name: /rooftop/i })).toBeInTheDocument();
  });

  it("starting works from the modal calls onStartUpgrade with the upgrade id", () => {
    const onStartUpgrade = jest.fn();
    renderView({ onStartUpgrade });
    fireEvent.click(screen.getByTestId("schematic-zone-rooms"));
    fireEvent.click(within(screen.getByTestId("upgrade-rooms-bedding")).getByRole("button", { name: /lancer les travaux/i }));
    expect(onStartUpgrade).toHaveBeenCalledWith("rooms-bedding");
  });

  it("the modal reflects the hotel's live state: after works start, the same modal shows them", () => {
    const { rerender } = renderView();
    fireEvent.click(screen.getByTestId("schematic-zone-rooms"));
    expect(screen.getByTestId("upgrade-rooms-bedding")).toHaveAttribute("data-status", "available");

    rerender(
      <MemoryRouter>
        <SchematicHotelView rooms={rooms} staffCount={1} diagnostics={[]} decisionFeedback={null} cleaningRoomIds={new Set()} hotelState={hotel(underWorks("rooms-bedding", 5))} day={3} onStartUpgrade={jest.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByTestId("upgrade-rooms-bedding")).toHaveAttribute("data-status", "in-progress");
  });

  it("closing the modal removes it", () => {
    renderView();
    fireEvent.click(screen.getByTestId("schematic-zone-rooms"));
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
