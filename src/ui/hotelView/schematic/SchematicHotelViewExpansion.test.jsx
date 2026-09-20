import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchematicHotelView from "./SchematicHotelView";
import { startFloorConstruction, advanceExpansion, fitOutRooms, CONSTRUCTION_DAYS, BASE_FLOORS } from "../../../lib/expansion/hotelExpansionEngine";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const baseRooms = [{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }];
const start = (capital = 500000) => ({ hotelState: { expansion: { availableCapital: capital } }, rooms: baseRooms });
const building = () => startFloorConstruction(start(), { day: 2 });
const built = () => {
  const b = startFloorConstruction(start(), { day: 0 });
  return { ...b, hotelState: advanceExpansion(b.hotelState, CONSTRUCTION_DAYS) };
};

function renderView(bundle = start(), props = {}) {
  return render(
    <MemoryRouter>
      <SchematicHotelView
        rooms={bundle.rooms}
        staffCount={1}
        diagnostics={[]}
        decisionFeedback={null}
        cleaningRoomIds={new Set()}
        hotelState={bundle.hotelState}
        day={3}
        onStartUpgrade={jest.fn()}
        onStartFloor={jest.fn()}
        onFitOut={jest.fn()}
        {...props}
      />
    </MemoryRouter>
  );
}

beforeEach(() => mockNavigate.mockClear());

describe("SchematicHotelView / building expansion", () => {
  it("shows no expansion UI when no hotel state is given (existing callers are unaffected)", () => {
    renderView(start(), { hotelState: undefined });
    expect(screen.queryByTestId("schematic-expansion")).not.toBeInTheDocument();
    expect(screen.queryByTestId("schematic-construction")).not.toBeInTheDocument();
  });

  it("an untouched hotel has an Extension chip and no new floor", () => {
    renderView();
    expect(screen.getByTestId("schematic-expansion")).toHaveAttribute("data-works", "false");
    expect(screen.queryByTestId("schematic-construction")).not.toBeInTheDocument();
    expect(screen.queryByTestId(`schematic-floor-${BASE_FLOORS + 1}`)).not.toBeInTheDocument();
  });

  it("while a floor is being built, a chantier row appears on top of the building with its completion day", () => {
    renderView(building());
    const row = screen.getByTestId("schematic-construction");
    expect(row).toHaveAttribute("data-level", String(BASE_FLOORS + 1));
    expect(row).toHaveTextContent(/chantier \/ extension en cours/i);
    expect(row).toHaveTextContent(`jour ${2 + CONSTRUCTION_DAYS}`);
    expect(screen.getByTestId("schematic-expansion")).toHaveAttribute("data-works", "true");
    // and it sits above every other floor
    const rows = screen.getAllByTestId(/^schematic-(construction|floor-\d+)$/);
    expect(rows[0]).toBe(row);
  });

  it("no chantier row once the floor is built; the floor shows up as a shell to fit out", () => {
    renderView(built());
    expect(screen.queryByTestId("schematic-construction")).not.toBeInTheDocument();
    const floor = screen.getByTestId("schematic-floor-5");
    expect(floor).toHaveAttribute("data-expansion", "true");
    expect(screen.getByTestId("schematic-floor-5-fitout")).toHaveTextContent(/à aménager/i);
  });

  it("the new floor is the topmost row, above the existing ones", () => {
    renderView(built());
    const rows = screen.getAllByTestId(/^schematic-floor-\d+$/);
    expect(rows[0]).toBe(screen.getByTestId("schematic-floor-5"));
  });

  it("fitted-out rooms appear as room cells on the new floor", () => {
    renderView(fitOutRooms(built(), 5, "suite", 2));
    const floor = screen.getByTestId("schematic-floor-5");
    expect(floor).toContainElement(screen.getByTestId("schematic-room-501"));
    expect(floor).toContainElement(screen.getByTestId("schematic-room-502"));
    // the existing building is not disturbed
    expect(screen.getByTestId("schematic-room-101")).toBeInTheDocument();
    expect(screen.getByTestId("schematic-floor-5-fitout")).toHaveTextContent(/＋ chambre/);
  });

  it("a full floor offers no more fit-out button", () => {
    renderView(fitOutRooms(built(), 5, "standard", 6));
    expect(screen.queryByTestId("schematic-floor-5-fitout")).not.toBeInTheDocument();
  });

  it("clicking a room of the new floor navigates like any other room", () => {
    renderView(fitOutRooms(built(), 5, "standard", 1));
    fireEvent.click(screen.getByTestId("schematic-room-501"));
    expect(mockNavigate).toHaveBeenCalled();
  });
});

describe("SchematicHotelView / opening the expansion modal", () => {
  it("the Extension chip opens it", () => {
    renderView();
    fireEvent.click(screen.getByTestId("schematic-expansion"));
    expect(screen.getByRole("dialog", { name: /extension du bâtiment/i })).toBeInTheDocument();
  });

  it("the chantier row opens it", () => {
    renderView(building());
    fireEvent.click(screen.getByRole("button", { name: /chantier \/ extension en cours/i }));
    expect(screen.getByTestId("expansion-works")).toBeInTheDocument();
  });

  it("the floor's fit-out button opens it", () => {
    renderView(built());
    fireEvent.click(screen.getByTestId("schematic-floor-5-fitout"));
    expect(screen.getByTestId("expansion-floor-5")).toBeInTheDocument();
  });

  it("starting the floor from the modal calls onStartFloor", () => {
    const onStartFloor = jest.fn();
    renderView(start(), { onStartFloor });
    fireEvent.click(screen.getByTestId("schematic-expansion"));
    fireEvent.click(screen.getByRole("button", { name: /lancer le gros œuvre/i }));
    expect(onStartFloor).toHaveBeenCalledTimes(1);
  });

  it("fitting out from the modal calls onFitOut with the floor and kind", () => {
    const onFitOut = jest.fn();
    renderView(built(), { onFitOut });
    fireEvent.click(screen.getByTestId("schematic-expansion"));
    fireEvent.click(screen.getByTestId("fitout-5-deluxe"));
    expect(onFitOut).toHaveBeenCalledWith(5, "deluxe");
  });

  it("the modal follows the hotel's live state", () => {
    const { rerender } = renderView();
    fireEvent.click(screen.getByTestId("schematic-expansion"));
    expect(screen.getByTestId("expansion-new-floor")).toHaveAttribute("data-status", "available");
    const next = building();
    rerender(
      <MemoryRouter>
        <SchematicHotelView rooms={next.rooms} staffCount={1} diagnostics={[]} decisionFeedback={null} cleaningRoomIds={new Set()} hotelState={next.hotelState} day={3} onStartFloor={jest.fn()} onFitOut={jest.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByTestId("expansion-new-floor")).toHaveAttribute("data-status", "in-progress");
  });

  it("closing removes it", () => {
    renderView();
    fireEvent.click(screen.getByTestId("schematic-expansion"));
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
