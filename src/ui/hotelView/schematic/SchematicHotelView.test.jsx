import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchematicHotelView from "./SchematicHotelView";

const mockNavigate = jest.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

function room(overrides) {
  return { id: "r1", number: "101", status: "libre", housekeeping_status: "clean", ...overrides };
}

function renderView(props = {}) {
  return render(
    <MemoryRouter>
      <SchematicHotelView rooms={[room()]} staffCount={2} diagnostics={[]} decisionFeedback={null} cleaningRoomIds={new Set()} {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => mockNavigate.mockClear());

describe("SchematicHotelView / presence", () => {
  it("renders the schematic root and a legend covering every zone type", () => {
    renderView();
    expect(screen.getByTestId("schematic-hotel-view")).toBeInTheDocument();
    const legend = within(screen.getByTestId("schematic-legend"));
    expect(legend.getByText("Chambre")).toBeInTheDocument();
    expect(legend.getByText("Réception")).toBeInTheDocument();
    expect(legend.getByText("Piscine")).toBeInTheDocument();
  });

  it("renders one floor row per distinct floor level actually present in the rooms it was given", () => {
    const rooms = Array.from({ length: 5 }, (_, i) => room({ id: `r${i}`, number: `10${i}` }));
    renderView({ rooms });
    const floorRows = screen.getAllByTestId(/^schematic-floor-/);
    expect(floorRows.length).toBeGreaterThan(0);
  });

  it("renders every ground-floor amenity", () => {
    renderView();
    ["reception", "restaurant", "kitchen", "bar", "laundry", "hall"].forEach((kind) => {
      expect(screen.getByTestId(`schematic-amenity-${kind}`)).toBeInTheDocument();
    });
  });

  it("grows the grid when given more rooms -- adaptabilité dynamique", () => {
    const { rerender } = renderView({ rooms: [room()] });
    const initialCount = screen.getAllByTestId(/^schematic-room-/).length;

    rerender(
      <MemoryRouter>
        <SchematicHotelView
          rooms={Array.from({ length: 8 }, (_, i) => room({ id: `r${i}`, number: `20${i}` }))}
          staffCount={2}
          diagnostics={[]}
          decisionFeedback={null}
          cleaningRoomIds={new Set()}
        />
      </MemoryRouter>
    );
    expect(screen.getAllByTestId(/^schematic-room-/).length).toBeGreaterThan(initialCount);
  });
});

describe("SchematicHotelView / real-time status", () => {
  it("reflects an occupied room's status via data-status and its label", () => {
    renderView({ rooms: [room({ status: "occupée" })] });
    const cell = screen.getByTestId("schematic-room-101");
    expect(cell.dataset.status).toBe("occupied");
    expect(cell).toHaveAttribute("aria-label", expect.stringContaining("Occupée"));
  });

  it("reflects a dirty room needing cleaning", () => {
    renderView({ rooms: [room({ housekeeping_status: "dirty" })] });
    expect(screen.getByTestId("schematic-room-101").dataset.status).toBe("dirty");
  });

  it("reflects a room currently being cleaned, overriding its own dirty status", () => {
    renderView({ rooms: [room({ id: "r1", housekeeping_status: "dirty" })], cleaningRoomIds: new Set(["r1"]) });
    expect(screen.getByTestId("schematic-room-101").dataset.status).toBe("cleaning");
  });

  it("shows an alert badge on an amenity when a high-severity diagnostic is open", () => {
    renderView({ diagnostics: [{ id: "d1", type: "error", message: "Panne machine à laver" }] });
    expect(screen.getByTestId("schematic-amenity-laundry-alert")).toBeInTheDocument();
  });

  it("shows no alert badge on amenities when there is no open incident", () => {
    renderView();
    expect(screen.queryByTestId("schematic-amenity-laundry-alert")).not.toBeInTheDocument();
  });
});

describe("SchematicHotelView / interactivity", () => {
  it("clicking a room cell navigates to its management page", () => {
    renderView();
    fireEvent.click(screen.getByTestId("schematic-room-101"));
    expect(mockNavigate).toHaveBeenCalledWith("/rooms");
  });

  it("clicking the reception cell navigates to the PMS/front office page", () => {
    renderView();
    fireEvent.click(screen.getByTestId("schematic-amenity-reception"));
    expect(mockNavigate).toHaveBeenCalledWith("/pms");
  });

  it("calls a provided onSelectZone instead of navigating when given one", () => {
    const onSelectZone = jest.fn();
    renderView({ onSelectZone });
    fireEvent.click(screen.getByTestId("schematic-room-101"));
    expect(onSelectZone).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("SchematicHotelView / direct-action alert indicator", () => {
  it("a dirty room carries its own separate alert indicator, distinct from the room block itself", () => {
    renderView({ rooms: [room({ housekeeping_status: "dirty" })] });
    expect(screen.getByTestId("schematic-room-101-alert")).toBeInTheDocument();
  });

  it("a clean, unoccupied room carries no alert indicator", () => {
    renderView();
    expect(screen.queryByTestId("schematic-room-101-alert")).not.toBeInTheDocument();
  });

  it("clicking a room's alert indicator falls back to the default route when no direct-action modal is registered for it", () => {
    renderView({ rooms: [room({ housekeeping_status: "dirty" })], directActionModals: {} });
    fireEvent.click(screen.getByTestId("schematic-room-101-alert"));
    expect(mockNavigate).toHaveBeenCalledWith("/rooms");
  });

  it("clicking an amenity's alert badge falls back to the default route when no direct-action modal is registered for it", () => {
    renderView({ diagnostics: [{ id: "d1", type: "error", message: "Panne" }], directActionModals: {} });
    fireEvent.click(screen.getByTestId("schematic-amenity-laundry-alert"));
    expect(mockNavigate).toHaveBeenCalledWith("/housekeeping");
  });

  it("clicking an alert indicator does NOT also trigger the block's own default-route click", () => {
    renderView({ rooms: [room({ housekeeping_status: "dirty" })], directActionModals: {} });
    fireEvent.click(screen.getByTestId("schematic-room-101-alert"));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("by default (no override), a dirty room's alert indicator opens the real HousekeepingQuickModal, not a navigation", () => {
    renderView({ rooms: [room({ housekeeping_status: "dirty" })] });
    fireEvent.click(screen.getByTestId("schematic-room-101-alert"));
    expect(screen.getByText(/chambre 101/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("by default (no override), the laundry alert badge opens the real IncidentQuickModal, not a navigation", () => {
    renderView({ diagnostics: [{ id: "d1", type: "error", severity: "high", message: "Panne machine à laver" }] });
    fireEvent.click(screen.getByTestId("schematic-amenity-laundry-alert"));
    expect(screen.getByText(/panne machine à laver/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("opens a registered direct-action modal instead of navigating, when one exists for the zone's type", () => {
    function FakeCleanRoomModal({ entity, onClose }) {
      return (
        <div data-testid="fake-clean-room-modal">
          Nettoyer la chambre {entity.metadata.number}
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
      );
    }
    renderView({ rooms: [room({ housekeeping_status: "dirty" })], directActionModals: { room: FakeCleanRoomModal } });

    fireEvent.click(screen.getByTestId("schematic-room-101-alert"));
    expect(screen.getByTestId("fake-clean-room-modal")).toBeInTheDocument();
    expect(screen.getByText(/nettoyer la chambre 101/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByTestId("fake-clean-room-modal")).not.toBeInTheDocument();
  });

  it("the block's own click still uses the default route even when a direct-action modal is registered for that zone type", () => {
    function FakeCleanRoomModal() {
      return <div data-testid="fake-clean-room-modal" />;
    }
    renderView({ rooms: [room({ housekeeping_status: "dirty" })], directActionModals: { room: FakeCleanRoomModal } });

    fireEvent.click(screen.getByTestId("schematic-room-101"));
    expect(mockNavigate).toHaveBeenCalledWith("/rooms");
    expect(screen.queryByTestId("fake-clean-room-modal")).not.toBeInTheDocument();
  });
});

describe("SchematicHotelView / accessibility", () => {
  it("carries an aria-label on its root and on every room/amenity cell", () => {
    renderView();
    expect(screen.getByTestId("schematic-hotel-view")).toHaveAttribute("aria-label");
    expect(screen.getByTestId("schematic-room-101")).toHaveAttribute("aria-label");
    expect(screen.getByTestId("schematic-amenity-reception")).toHaveAttribute("aria-label");
  });
});
