import { purchaseItems } from "../suppliers/suppliersEngine";
import { takeLoan } from "../banking/bankingLoanEngine";
import { massesBilantaires, financialRatios, hotelKpis, describeFinancialAnalysis } from "./financialRatiosEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [35000], costs: [0], payroll: 9000, fixedCosts: 4000 }, expansion: { availableCapital: 0 }, ...extra });
const restaurant = (extra = {}) => ({ finance: { revenue: [0], costs: [0] }, ...extra });
const rooms = [
  { id: 1, number: "101", type: "standard", price: 120, status: "occupée" },
  { id: 2, number: "102", type: "standard", price: 120, status: "libre" },
  { id: 3, number: "201", type: "deluxe", price: 180, status: "occupée" },
  { id: 4, number: "S01", type: "seminar", price: 450, status: "libre" },
];

describe("financialRatiosEngine / masses bilantaires", () => {
  it("FR − BFR retombe exactement sur la trésorerie du Bilan", () => {
    const state = hotel();
    const masses = massesBilantaires(state);
    expect(masses.isConsistent).toBe(true);
    expect(masses.tn).toBe(35000);
  });

  it("le BFR est la valeur des stocks", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "linens-sheets-entry", quantity: 1 }], { day: 1 }).hotelState;
    const masses = massesBilantaires(state, 1);
    expect(masses.bfr).toBeGreaterThan(0);
    expect(masses.isConsistent).toBe(true);
  });
});

describe("financialRatiosEngine / ratios financiers", () => {
  it("l'autonomie financière d'un hôtel sans dette est de 100 %", () => {
    const ratios = financialRatios(hotel(), restaurant());
    expect(ratios.autonomieFinanciere).toBe(1);
  });

  it("lit '—' (null) plutôt que l'infini quand le dénominateur est nul", () => {
    const ratios = financialRatios(hotel(), restaurant());
    expect(ratios.solvabilite).toBeNull(); // no debt at all
    expect(ratios.liquiditeGenerale).toBeNull(); // no short-term debt
  });

  it("la solvabilité se calcule une fois un emprunt contracté", () => {
    const state = takeLoan({ hotelState: hotel() }, "cash", 5000, { day: 1 }).hotelState;
    const ratios = financialRatios(state, restaurant(), 1);
    expect(ratios.solvabilite).toBeGreaterThan(0);
  });

  it("la liquidité générale se calcule une fois le compte à découvert", () => {
    const state = hotel({ finance: { revenue: [0], costs: [4000], payroll: 0, fixedCosts: 0 } });
    const ratios = financialRatios(state, restaurant());
    expect(ratios.liquiditeGenerale).not.toBeNull();
    expect(ratios.liquiditeReduite).toBe(0); // no treasury left
  });

  it("la marge d'EBITDA réintègre amortissements et intérêts au résultat", () => {
    const ratios = financialRatios(hotel({ finance: { revenue: [10000], costs: [0], payroll: 0, fixedCosts: 0 } }), restaurant());
    expect(ratios.ebitda).toBe(10000);
    expect(ratios.margeEbitda).toBe(1);
  });
});

describe("financialRatiosEngine / KPIs hôteliers", () => {
  it("calcule le taux d'occupation, l'ADR et le RevPAR à partir des chambres du jour, hors salles de réunion", () => {
    const kpis = hotelKpis(rooms);
    expect(kpis.totalRooms).toBe(3); // the seminar room is excluded
    expect(kpis.occupiedRooms).toBe(2);
    expect(kpis.occupancyRate).toBe(67);
    expect(kpis.adr).toBe((120 + 180) / 2);
    expect(kpis.revpar).toBeCloseTo((150 * 2) / 3, 1);
  });

  it("lit null pour TrevPAR/CPOR/GOPPAR sans le rapport du jour", () => {
    const kpis = hotelKpis(rooms);
    expect(kpis.trevpar).toBeNull();
    expect(kpis.cpor).toBeNull();
    expect(kpis.goppar).toBeNull();
  });

  it("les calcule une fois le rapport du jour fourni", () => {
    const kpis = hotelKpis(rooms, { dailyRevenue: 900, dailyCosts: 300 });
    expect(kpis.trevpar).toBe(300); // 900 / 3 rooms
    expect(kpis.cpor).toBe(150); // 300 / 2 occupied
    expect(kpis.goppar).toBe(200); // (900-300) / 3 rooms
  });
});

describe("financialRatiosEngine / describeFinancialAnalysis", () => {
  it("réunit les masses, les ratios et les KPIs", () => {
    const described = describeFinancialAnalysis(hotel(), restaurant(), rooms, { dailyRevenue: 900, dailyCosts: 300 });
    expect(described.masses.isConsistent).toBe(true);
    expect(described.ratios.autonomieFinanciere).toBe(1);
    expect(described.kpis.goppar).toBe(200);
  });
});

describe("financialRatiosEngine / purity", () => {
  it("is deterministic and leaves its input alone", () => {
    const state = hotel();
    const frozen = JSON.stringify(state);
    expect(describeFinancialAnalysis(state, restaurant(), rooms)).toEqual(describeFinancialAnalysis(state, restaurant(), rooms));
    expect(JSON.stringify(state)).toBe(frozen);
  });
});
