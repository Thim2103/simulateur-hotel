import { render, screen, fireEvent } from "@testing-library/react";
import ExpansionModal from "./ExpansionModal";
import { startFloorConstruction, advanceExpansion, fitOutRooms, CONSTRUCTION_DAYS, FLOOR_BASE_COST, ROOM_KINDS, SLOTS_PER_FLOOR } from "../../../lib/expansion/hotelExpansionEngine";

const baseRooms = [{ id: 1, number: "101", type: "standard", price: 100, floor: 1 }];
const start = (capital = 500000) => ({ hotelState: { expansion: { availableCapital: capital } }, rooms: baseRooms });
const built = (capital) => {
  const b = startFloorConstruction(start(capital), { day: 0 });
  return { ...b, hotelState: advanceExpansion(b.hotelState, CONSTRUCTION_DAYS) };
};
const building = (capital) => startFloorConstruction(start(capital), { day: 2 });

const renderModal = (bundle = start(), props = {}) =>
  render(<ExpansionModal hotelState={bundle.hotelState} rooms={bundle.rooms} day={4} onStartFloor={jest.fn()} onFitOut={jest.fn()} onClose={jest.fn()} {...props} />);
const startButton = () => screen.getByRole("button", { name: /lancer le gros œuvre/i });

describe("ExpansionModal / the new floor", () => {
  it("proposes the next floor with its cost, duration and capacity", () => {
    renderModal();
    const section = screen.getByTestId("expansion-new-floor");
    expect(section).toHaveTextContent(/étage 5/i);
    expect(section.textContent.replace(/\s| | /g, "")).toContain("150000€");
    expect(section).toHaveTextContent(`${CONSTRUCTION_DAYS} j de gros œuvre`);
    expect(section).toHaveTextContent(`${SLOTS_PER_FLOOR} chambres`);
    expect(startButton()).toBeEnabled();
  });

  it("shows the capacity and the funds", () => {
    renderModal();
    expect(screen.getByTestId("expansion-capacity")).toHaveTextContent("1 chambres");
    expect(screen.getByTestId("expansion-funds").textContent.replace(/\s| | /g, "")).toContain("500000€");
    expect(screen.queryByTestId("expansion-treasury")).not.toBeInTheDocument();
  });

  it("shows the treasury too when the hotel has one", () => {
    const bundle = { ...start(1000), hotelState: { expansion: { availableCapital: 1000 }, finance: { revenue: [200000], costs: [0] } } };
    renderModal(bundle);
    expect(screen.getByTestId("expansion-treasury").textContent.replace(/\s| | /g, "")).toContain("200000€");
    expect(startButton()).toBeEnabled(); // capital + treasury cover 150 000 €
  });

  it("starting calls onStartFloor, once even if double-clicked", () => {
    const onStartFloor = jest.fn();
    renderModal(start(), { onStartFloor });
    fireEvent.click(startButton());
    fireEvent.click(startButton());
    expect(onStartFloor).toHaveBeenCalledTimes(1);
    expect(startButton()).toBeDisabled();
  });

  it("is disabled, with the reason, when funds are short", () => {
    renderModal(start(1000));
    expect(startButton()).toBeDisabled();
    expect(screen.getByTestId("expansion-floor-status")).toHaveTextContent(/fonds insuffisants/i);
  });

  it("while a floor is being built, shows the works and disables a second one", () => {
    renderModal(building());
    expect(screen.getByTestId("expansion-works")).toHaveTextContent(/étage 5.*jour 7/i);
    expect(startButton()).toBeDisabled();
    expect(screen.getByTestId("expansion-floor-status")).toHaveTextContent(/chantier est déjà en cours/i);
  });
});

describe("ExpansionModal / fitting out", () => {
  it("nothing to fit out before a floor is built, and it says what comes next", () => {
    renderModal();
    expect(screen.queryByTestId("expansion-floor-5")).not.toBeInTheDocument();
    expect(screen.getByText(/vous pourrez y aménager des chambres/i)).toBeInTheDocument();
  });

  it("a built floor offers Standard, Deluxe and Suite with their costs", () => {
    renderModal(built());
    const floor = screen.getByTestId("expansion-floor-5");
    expect(floor).toHaveTextContent(`0/${SLOTS_PER_FLOOR} chambres`);
    Object.entries(ROOM_KINDS).forEach(([kind, spec]) => {
      const button = screen.getByTestId(`fitout-5-${kind}`);
      expect(button).toBeEnabled();
      expect(button).toHaveTextContent(spec.label);
      expect(button.textContent.replace(/\s| | /g, "")).toContain(`${spec.cost}€`);
    });
  });

  it("clicking a kind calls onFitOut with the floor and the kind", () => {
    const onFitOut = jest.fn();
    renderModal(built(), { onFitOut });
    fireEvent.click(screen.getByTestId("fitout-5-suite"));
    expect(onFitOut).toHaveBeenCalledWith(5, "suite");
  });

  it("counts the rooms already there", () => {
    const b = fitOutRooms(built(), 5, "standard", 2);
    renderModal(b);
    expect(screen.getByTestId("expansion-floor-5")).toHaveTextContent(`2/${SLOTS_PER_FLOOR} chambres`);
    expect(screen.getByTestId("expansion-capacity")).toHaveTextContent(/3 chambres.*dont 2 issues de l'extension/);
  });

  it("a full floor can't take more", () => {
    renderModal(fitOutRooms(built(), 5, "standard", SLOTS_PER_FLOOR));
    expect(screen.getByTestId("fitout-5-standard")).toBeDisabled();
    expect(screen.getByTestId("fitout-5-standard")).toHaveAttribute("data-status", "floor-full");
    expect(screen.getByTestId("expansion-floor-5")).toHaveTextContent(/étage complet/i);
  });

  it("kinds the funds can't cover are disabled, cheaper ones stay available", () => {
    renderModal(built(FLOOR_BASE_COST + 15000));
    expect(screen.getByTestId("fitout-5-standard")).toBeEnabled();
    expect(screen.getByTestId("fitout-5-suite")).toBeDisabled();
    expect(screen.getByTestId("fitout-5-suite")).toHaveAttribute("data-status", "no-funds");
  });
});

describe("ExpansionModal / closing", () => {
  it("closes through its close button", () => {
    const onClose = jest.fn();
    renderModal(start(), { onClose });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
