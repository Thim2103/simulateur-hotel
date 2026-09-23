// Tableau des Actifs à Financer & Plan de Financement Initial (TFE, Partie
// 1) -- what a feasibility study asks first: what does the fit-out cost
// (BESOINS), and what pays for it (RESSOURCES)? Reads the exact same
// figures the Bilan (lib/accounting/accountingEngine.js) and the
// depreciation plan (./depreciationEngine.js) already compute -- no state
// of its own, so the two screens can never disagree.
//
// BESOINS D'INVESTISSEMENT INITIAL:
//   - Immobilisations corporelles  -- the fit-out's TFE Classe 23/24/26 lots
//     (./depreciationEngine.js), at acquisition cost
//   - Immobilisations incorporelles -- Classe 21 (PMS, site web)
//   - Frais d'établissement (200)  -- a fixed lump this simulator does not
//     otherwise model (notaire, immatriculation...): ESTABLISHMENT_COSTS
//   - BFR de démarrage             -- one month of fixed running costs
//     (payroll + fixedCosts), the standard rule-of-thumb cash cushion a
//     feasibility study reserves before the till starts filling
//
// RESSOURCES DE FINANCEMENT:
//   - Fonds propres / apport personnel (100/110) -- capitaux propres, i.e.
//     accountingEngine.js's own equity figure
//   - Emprunts bancaires long terme (173)         -- the bank's outstanding
//     loans (lib/banking/)
//   - Subsides (15)                                -- not modelled: 0,
//     disclosed rather than invented
//
// LE BILAN INITIAL S'ÉQUILIBRE TOUJOURS: what Ressources doesn't spend on
// Besoins' own three lines is the plan's opening cash cushion -- so Total
// Actif (Besoins + this cash) = Total Passif (Ressources) by construction,
// the same way accountingEngine.js's own Bilan always balances.
import { safeNumber } from "../safe";
import { liabilitiesOf } from "../accounting/accountingEngine";
import { depreciationSummaryByClass } from "./depreciationEngine";

export const ESTABLISHMENT_COSTS = 1500;

function sumClasses(byClass, classIds) {
  return byClass.filter((entry) => classIds.includes(entry.code)).reduce((sum, entry) => sum + entry.va, 0);
}

// One month's worth of the hotel's own fixed running costs (payroll +
// fixedCosts) -- the standard "un mois de charges d'avance" rule of thumb
// for a start-up's working-capital cushion.
export function startingWorkingCapital(hotelState) {
  const finance = hotelState?.finance || {};
  return Math.round((safeNumber(finance.payroll, 0) + safeNumber(finance.fixedCosts, 0)) * 100) / 100;
}

export function investmentNeeds(hotelState, day = 0) {
  const byClass = depreciationSummaryByClass(hotelState, day);
  const corporelles = Math.round(sumClasses(byClass, [23, 24, 26]) * 100) / 100;
  const incorporelles = Math.round(sumClasses(byClass, [21]) * 100) / 100;
  const fraisEtablissement = ESTABLISHMENT_COSTS;
  const bfr = startingWorkingCapital(hotelState);
  return { corporelles, incorporelles, fraisEtablissement, bfr, total: Math.round((corporelles + incorporelles + fraisEtablissement + bfr) * 100) / 100 };
}

export function financingResources(hotelState, day = 0) {
  const liabilities = liabilitiesOf(hotelState, day);
  const apportPersonnel = liabilities.equity;
  const empruntsLT = liabilities.loans;
  const subsides = 0;
  return { apportPersonnel, empruntsLT, subsides, total: Math.round((apportPersonnel + empruntsLT + subsides) * 100) / 100 };
}

// The initial balance sheet a feasibility study opens on: Besoins (the
// investment plan) plus whatever cash is left of the Ressources once the
// plan is funded, always in balance.
export function describeInitialBalance(hotelState, day = 0) {
  const needs = investmentNeeds(hotelState, day);
  const resources = financingResources(hotelState, day);
  const cashCushion = Math.max(0, Math.round((resources.total - needs.total) * 100) / 100);
  const isFinancingSufficient = resources.total >= needs.total;
  return {
    needs,
    resources,
    cashCushion,
    totalActifInitial: Math.round((needs.total + cashCushion) * 100) / 100,
    isFinancingSufficient,
    isBalanced: Math.abs(needs.total + cashCushion - resources.total) < 0.01,
  };
}

const FinancingEngine = { investmentNeeds, financingResources, describeInitialBalance, startingWorkingCapital };
export default FinancingEngine;
