// Plan d'Amortissements (TFE, Partie 1) -- the fit-out investment's own
// depreciation table, read the exact same way lib/accounting/
// accountingEngine.js's Bilan does (same lots, same useful lives, same
// straight-line formula -- imported, not recomputed, so the two screens can
// never disagree), but regrouped under the TFE's own PCMN classes (20/21/23/
// 24/26) and presented as a real depreciation schedule: Valeur d'Acquisition,
// durée, taux, dotation annuelle, amortissements cumulés, VCN.
//
// SCOPE. Only what furnishes and equips the hotel -- suppliers' Classe 2
// purchases (lib/suppliers/) -- is in this table: a new wing, a spa or an
// extra floor (lib/expansion/) are structural expansion, not the initial
// fit-out a feasibility study's investment plan is about, so they stay out
// of it (they still show, and still depreciate, in the Bilan itself).
import { safeNumber } from "../safe";
import { immobilisationLots, depreciationOf } from "../accounting/accountingEngine";

const YEAR_DAYS = 365;

export const TFE_CLASSES = {
  20: { code: 20, label: "Frais d'établissement" },
  21: { code: 21, label: "Immobilisations incorporelles (PMS, site internet)" },
  23: { code: 23, label: "Installations, machines & équipements" },
  24: { code: 24, label: "Mobilier" },
  26: { code: 26, label: "Aménagements divers" },
};
export const TFE_CLASS_IDS = Object.keys(TFE_CLASSES).map(Number);

// Which TFE class a real PCMN account code (suppliersData.js's own, or one
// of accountingEngine's synthetic ones) falls under -- null for anything
// this table doesn't cover (see this module's docstring).
export function tfeClassOf(accountCode) {
  const code = safeNumber(accountCode, 0);
  if (code === 2130) return 21; // PMS licence
  if (code >= 24010 && code <= 24099) return 24; // furniture (chambres/hall/resto/terrasse)
  if (code === 2420) return 26; // decor & ambiance
  if ([234, 2341, 2343, 2344, 2370, 2410].includes(code)) return 23; // fluids, tableware, electronics
  return null; // majorProjects/zoneUpgrades/floors' synthetic accounts, or unknown
}

// Every fit-out lot (see this module's docstring for scope), each carrying
// its TFE class, its rate (1/years) and today's depreciation.
export function depreciationLots(hotelState, day = 0) {
  return immobilisationLots(hotelState)
    .map((lot) => ({ ...lot, tfeClass: tfeClassOf(lot.accountCode) }))
    .filter((lot) => lot.tfeClass !== null)
    .map((lot) => {
      const years = Math.round((lot.usefulLifeDays / YEAR_DAYS) * 10) / 10;
      const depreciation = depreciationOf(lot, day);
      return {
        label: lot.label,
        accountCode: lot.accountCode,
        tfeClass: lot.tfeClass,
        acquiredOnDay: lot.acquiredOnDay,
        va: Math.round(lot.cost * 100) / 100,
        years,
        rate: Math.round((1 / years) * 1000) / 1000,
        annualDotation: Math.round((lot.cost / years) * 100) / 100,
        cumulative: Math.round(depreciation * 100) / 100,
        vcn: Math.round((lot.cost - depreciation) * 100) / 100,
      };
    });
}

// The same table, one row per TFE class instead of one row per lot -- the
// "tableau synthétique" a feasibility study's reader wants first.
export function depreciationSummaryByClass(hotelState, day = 0) {
  const lots = depreciationLots(hotelState, day);
  return TFE_CLASS_IDS.map((classId) => {
    const inClass = lots.filter((lot) => lot.tfeClass === classId);
    return {
      ...TFE_CLASSES[classId],
      count: inClass.length,
      va: Math.round(inClass.reduce((sum, lot) => sum + lot.va, 0) * 100) / 100,
      annualDotation: Math.round(inClass.reduce((sum, lot) => sum + lot.annualDotation, 0) * 100) / 100,
      cumulative: Math.round(inClass.reduce((sum, lot) => sum + lot.cumulative, 0) * 100) / 100,
      vcn: Math.round(inClass.reduce((sum, lot) => sum + lot.vcn, 0) * 100) / 100,
    };
  });
}

// The whole plan at a glance: the individual table, the synthetic-by-class
// table, and the grand total.
export function describeDepreciationPlan(hotelState, day = 0) {
  const lots = depreciationLots(hotelState, day);
  const byClass = depreciationSummaryByClass(hotelState, day);
  const total = {
    va: Math.round(lots.reduce((sum, lot) => sum + lot.va, 0) * 100) / 100,
    annualDotation: Math.round(lots.reduce((sum, lot) => sum + lot.annualDotation, 0) * 100) / 100,
    cumulative: Math.round(lots.reduce((sum, lot) => sum + lot.cumulative, 0) * 100) / 100,
    vcn: Math.round(lots.reduce((sum, lot) => sum + lot.vcn, 0) * 100) / 100,
  };
  return { day, lots, byClass, total, classes: TFE_CLASSES };
}

const DepreciationEngine = { tfeClassOf, depreciationLots, depreciationSummaryByClass, describeDepreciationPlan };
export default DepreciationEngine;
