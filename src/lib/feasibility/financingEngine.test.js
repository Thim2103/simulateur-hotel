import { purchaseItems } from "../suppliers/suppliersEngine";
import { takeLoan } from "../banking/bankingLoanEngine";
import { itemById } from "../suppliers/suppliersData";
import { ESTABLISHMENT_COSTS, startingWorkingCapital, investmentNeeds, financingResources, describeInitialBalance } from "./financingEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [35000], costs: [0], payroll: 9000, fixedCosts: 4000 }, expansion: { availableCapital: 0 }, structure: { starRating: 3 }, ...extra });

describe("financingEngine / le BFR de démarrage", () => {
  it("is one month of payroll + fixedCosts", () => {
    expect(startingWorkingCapital(hotel())).toBe(9000 + 4000);
  });

  it("is zero for a hotel with neither", () => {
    expect(startingWorkingCapital(hotel({ finance: { revenue: [0], costs: [0], payroll: 0, fixedCosts: 0 } }))).toBe(0);
  });
});

describe("financingEngine / les besoins d'investissement", () => {
  it("a brand-new hotel needs only its frais d'établissement and its BFR", () => {
    const needs = investmentNeeds(hotel());
    expect(needs).toEqual({ corporelles: 0, incorporelles: 0, fraisEtablissement: ESTABLISHMENT_COSTS, bfr: 13000, total: ESTABLISHMENT_COSTS + 13000 });
  });

  it("furniture/decor/equipment count as corporelles, PMS as incorporelles", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }, { itemId: "electronics-pms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const needs = investmentNeeds(state, 1);
    const furniture = itemById("furniture-rooms-entry");
    const pms = itemById("electronics-pms-entry");
    expect(needs.corporelles).toBe(furniture.price + furniture.deliveryFee + furniture.installationCost);
    expect(needs.incorporelles).toBe(pms.price + pms.deliveryFee + pms.installationCost);
  });
});

describe("financingEngine / les ressources de financement", () => {
  it("l'apport personnel est les capitaux propres, sans emprunt ni subside", () => {
    const resources = financingResources(hotel());
    expect(resources).toEqual({ apportPersonnel: 35000, empruntsLT: 0, subsides: 0, total: 35000 });
  });

  it("un emprunt bancaire s'ajoute à l'apport", () => {
    const state = takeLoan({ hotelState: hotel() }, "cash", 5000, { day: 1 }).hotelState;
    const resources = financingResources(state, 1);
    expect(resources.empruntsLT).toBe(5000);
    expect(resources.total).toBe(resources.apportPersonnel + 5000);
  });
});

describe("financingEngine / le bilan initial prévisionnel", () => {
  it("s'équilibre toujours : le surplus de financement devient la trésorerie de départ", () => {
    const described = describeInitialBalance(hotel());
    expect(described.isBalanced).toBe(true);
    expect(described.isFinancingSufficient).toBe(true);
    expect(described.totalActifInitial).toBeCloseTo(described.resources.total, 6);
  });

  it("reste équilibré une fois un investissement réalisé", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }, { itemId: "equipment-climate-luxury", quantity: 1 }], { day: 1 }).hotelState;
    const described = describeInitialBalance(state, 1);
    expect(described.isBalanced).toBe(true);
    expect(described.needs.corporelles).toBeGreaterThan(0);
  });

  it("dit quand le financement ne couvre pas les besoins", () => {
    // A tiny apport (treasury) can't cover even the frais d'établissement + BFR.
    const described = describeInitialBalance(hotel({ finance: { revenue: [100], costs: [0], payroll: 9000, fixedCosts: 4000 } }));
    expect(described.isFinancingSufficient).toBe(false);
    expect(described.cashCushion).toBe(0);
  });
});

describe("financingEngine / purity", () => {
  it("is deterministic and leaves its input alone", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const frozen = JSON.stringify(state);
    expect(describeInitialBalance(state, 5)).toEqual(describeInitialBalance(state, 5));
    expect(JSON.stringify(state)).toBe(frozen);
  });
});
