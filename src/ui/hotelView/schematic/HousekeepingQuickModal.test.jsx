import { render, screen, fireEvent } from "@testing-library/react";
import HousekeepingQuickModal from "./HousekeepingQuickModal";

function dirtyRoomEntity(overrides = {}) {
  return { id: "room:1", type: "room", state: "dirty", metadata: { number: "101", floorLevel: 3, roomId: 1 }, ...overrides };
}

describe("HousekeepingQuickModal / presence", () => {
  it("shows the room number and its current status", () => {
    render(<HousekeepingQuickModal entity={dirtyRoomEntity()} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: /chambre 101/i })).toBeInTheDocument();
    expect(screen.getByTestId("housekeeping-modal-status")).toHaveTextContent(/à nettoyer/i);
  });

  it("reflects a room currently being cleaned", () => {
    render(<HousekeepingQuickModal entity={dirtyRoomEntity({ state: "cleaning" })} onClose={() => {}} />);
    expect(screen.getByTestId("housekeeping-modal-status")).toHaveTextContent(/nettoyage en cours/i);
  });
});

describe("HousekeepingQuickModal / assigning a housekeeper", () => {
  it("suggests a housekeeper from the real roster when clicking 'Assigner'", () => {
    render(<HousekeepingQuickModal entity={dirtyRoomEntity()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /assigner/i }));
    expect(screen.getByTestId("housekeeping-modal-assigned")).toBeInTheDocument();
  });

  it("suggests the SAME housekeeper for the same room across renders -- deterministic, not random", () => {
    const { unmount } = render(<HousekeepingQuickModal entity={dirtyRoomEntity()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /assigner/i }));
    const firstText = screen.getByTestId("housekeeping-modal-assigned").textContent;
    unmount();

    render(<HousekeepingQuickModal entity={dirtyRoomEntity()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /assigner/i }));
    expect(screen.getByTestId("housekeeping-modal-assigned").textContent).toBe(firstText);
  });
});

describe("HousekeepingQuickModal / priority cleaning", () => {
  it("calls the provided onPriorityClean with the room entity when launching a priority clean", () => {
    const onPriorityClean = jest.fn();
    const entity = dirtyRoomEntity();
    render(<HousekeepingQuickModal entity={entity} onClose={() => {}} onPriorityClean={onPriorityClean} />);
    fireEvent.click(screen.getByRole("button", { name: /nettoyage prioritaire/i }));
    expect(onPriorityClean).toHaveBeenCalledWith(entity);
    expect(screen.getByTestId("housekeeping-modal-priority-launched")).toBeInTheDocument();
  });

  it("still shows a confirmation even without an onPriorityClean prop -- never a dead-end click", () => {
    render(<HousekeepingQuickModal entity={dirtyRoomEntity()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /nettoyage prioritaire/i }));
    expect(screen.getByTestId("housekeeping-modal-priority-launched")).toBeInTheDocument();
  });
});

describe("HousekeepingQuickModal / closing", () => {
  it("calls onClose when dismissed", () => {
    const onClose = jest.fn();
    render(<HousekeepingQuickModal entity={dirtyRoomEntity()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
