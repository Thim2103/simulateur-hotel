import { render, screen, fireEvent } from "@testing-library/react";
import IncidentQuickModal from "./IncidentQuickModal";
import { REPAIR_COST, REPAIR_DELAY_DAYS, EMERGENCY_COST_MULTIPLIER } from "../../../lib/maintenance/incidentEngine";

function laundryAlertEntity(overrides = {}) {
  return {
    id: "amenity:laundry",
    type: "laundry",
    state: "alert",
    metadata: { message: "Panne machine à laver", severity: "critical", incidentId: "incident:laundry:Panne machine à laver", repairEtaDay: null },
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
    render(<IncidentQuickModal entity={laundryAlertEntity({ metadata: { severity: "critical" } })} onClose={() => {}} />);
    expect(screen.getByTestId("incident-modal-message")).toHaveTextContent(/problème technique/i);
  });

  it("shows the exact standard/emergency cost and delay derived from the incident's own severity tier", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity({ metadata: { severity: "minor" } })} onClose={() => {}} />);
    expect(screen.getByTestId("incident-modal-standard-cost")).toHaveTextContent(`${REPAIR_COST.minor} € — ${REPAIR_DELAY_DAYS.minor} j`);
    expect(screen.getByTestId("incident-modal-emergency-cost")).toHaveTextContent(`${Math.round(REPAIR_COST.minor * EMERGENCY_COST_MULTIPLIER)} €`);
  });

  it("prefers the entity's own real repairCost over the severity-tier default when given one", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity({ metadata: { severity: "critical", repairCost: 999 } })} onClose={() => {}} />);
    expect(screen.getByTestId("incident-modal-standard-cost")).toHaveTextContent("999 €");
  });
});

describe("IncidentQuickModal / repairing status", () => {
  it("shows a repairing message with the real ETA day and hides the cost table while a repair is in progress", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity({ state: "repairing", metadata: { severity: "critical", repairEtaDay: 12 } })} onClose={() => {}} />);
    expect(screen.getByTestId("incident-modal-repairing")).toHaveTextContent(/jour 12/);
    expect(screen.queryByTestId("incident-modal-standard-cost")).not.toBeInTheDocument();
  });

  it("disables both action buttons while a repair is already in progress", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity({ state: "repairing" })} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: /appeler un technicien/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /réparation d'urgence/i })).toBeDisabled();
  });
});

describe("IncidentQuickModal / actions", () => {
  it("calls the provided onRepairNow with the entity for the emergency repair", () => {
    const onRepairNow = jest.fn();
    const entity = laundryAlertEntity();
    render(<IncidentQuickModal entity={entity} onClose={() => {}} onRepairNow={onRepairNow} />);
    fireEvent.click(screen.getByRole("button", { name: /réparation d'urgence/i }));
    expect(onRepairNow).toHaveBeenCalledWith(entity);
    expect(screen.getByTestId("incident-modal-confirmation")).toHaveTextContent(/résolue immédiatement/i);
  });

  it("calls the provided onCallTechnician with the entity for the standard repair", () => {
    const onCallTechnician = jest.fn();
    const entity = laundryAlertEntity();
    render(<IncidentQuickModal entity={entity} onClose={() => {}} onCallTechnician={onCallTechnician} />);
    fireEvent.click(screen.getByRole("button", { name: /appeler un technicien/i }));
    expect(onCallTechnician).toHaveBeenCalledWith(entity);
    expect(screen.getByTestId("incident-modal-confirmation")).toHaveTextContent(/réparation en cours/i);
  });

  it("still confirms locally even without onRepairNow/onCallTechnician props -- never a dead-end click", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /réparation d'urgence/i }));
    expect(screen.getByTestId("incident-modal-confirmation")).toBeInTheDocument();
  });

  it("disables both action buttons once one action has been taken", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /réparation d'urgence/i }));
    expect(screen.getByRole("button", { name: /réparation d'urgence/i })).toBeDisabled();
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

describe("IncidentQuickModal / in-house technician terms", () => {
  const withTechnician = { hasTechnician: true, emergencyMultiplier: 1.2, delayReduction: 1 };

  it("shows the cheaper emergency price and shorter delay, plus a note, when a technician is on staff", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity({ metadata: { severity: "critical" } })} onClose={() => {}} repairTerms={withTechnician} />);
    expect(screen.getByTestId("incident-modal-emergency-cost")).toHaveTextContent(`${Math.round(REPAIR_COST.critical * 1.2)} €`);
    expect(screen.getByTestId("incident-modal-standard-cost")).toHaveTextContent(`${REPAIR_COST.critical} € — ${REPAIR_DELAY_DAYS.critical - 1} j`);
    expect(screen.getByTestId("incident-modal-technician-note")).toBeInTheDocument();
  });

  it("shows the external-contractor terms and no note without one", () => {
    render(<IncidentQuickModal entity={laundryAlertEntity({ metadata: { severity: "critical" } })} onClose={() => {}} />);
    expect(screen.getByTestId("incident-modal-emergency-cost")).toHaveTextContent(`${Math.round(REPAIR_COST.critical * EMERGENCY_COST_MULTIPLIER)} €`);
    expect(screen.queryByTestId("incident-modal-technician-note")).not.toBeInTheDocument();
  });
});
