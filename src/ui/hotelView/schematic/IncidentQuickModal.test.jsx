import { render, screen, fireEvent } from "@testing-library/react";
import IncidentQuickModal from "./IncidentQuickModal";

function laundryAlertEntity(overrides = {}) {
  return {
    id: "amenity:laundry",
    type: "laundry",
    state: "alert",
    metadata: { message: "Panne machine à laver", severity: "high" },
    ...overrides,
  };
}

describe("IncidentQuickModal / presence", () => {
  it("shows the zone label and the real diagnostic message", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity()} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: /panne.*buanderie/i })).toBeInTheDocument();
    expect(screen.getByTestId("incident-modal-message")).toHaveTextContent("Panne machine à laver");
  });

  it("falls back to a generic message when the entity carries none", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity({ metadata: {} })} onClose={() => {}} />);
    expect(screen.getByTestId("incident-modal-message")).toHaveTextContent(/problème technique/i);
  });

  it("shows a cost and delay estimate derived from the diagnostic's own severity", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity({ metadata: { message: "Panne", severity: "low" } })} onClose={() => {}} />);
    expect(screen.getByTestId("incident-modal-cost")).toHaveTextContent("50 € – 150 €");
    expect(screen.getByTestId("incident-modal-delay")).toHaveTextContent(/24 heures/i);
  });
});

describe("IncidentQuickModal / actions", () => {
  it("calls the provided onRepairNow with the entity and shows a confirmation", () => {
    const onRepairNow = jest.fn();
    const entity = laundryAlertEntity();
    render(<IncidentQuickModal entity={entity} onClose={() => {}} onRepairNow={onRepairNow} />);
    fireEvent.click(screen.getByRole("button", { name: /réparer immédiatement/i }));
    expect(onRepairNow).toHaveBeenCalledWith(entity);
    expect(screen.getByTestId("incident-modal-confirmation")).toHaveTextContent(/réparation lancée/i);
  });

  it("calls the provided onCallTechnician with the entity and shows a confirmation", () => {
    const onCallTechnician = jest.fn();
    const entity = laundryAlertEntity();
    render(<IncidentQuickModal entity={entity} onClose={() => {}} onCallTechnician={onCallTechnician} />);
    fireEvent.click(screen.getByRole("button", { name: /appeler un technicien/i }));
    expect(onCallTechnician).toHaveBeenCalledWith(entity);
    expect(screen.getByTestId("incident-modal-confirmation")).toHaveTextContent(/technicien a été appelé/i);
  });

  it("still confirms locally even without onRepairNow/onCallTechnician props -- never a dead-end click", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /réparer immédiatement/i }));
    expect(screen.getByTestId("incident-modal-confirmation")).toBeInTheDocument();
  });

  it("disables both action buttons once one action has been taken", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /réparer immédiatement/i }));
    expect(screen.getByRole("button", { name: /réparer immédiatement/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /appeler un technicien/i })).toBeDisabled();
  });
});

describe("IncidentQuickModal / closing", () => {
  it("calls onClose when dismissed", () => {
    const onClose = jest.fn();
    render(<IncidentQuickModal entity={laundryAlertEntity()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
