// Professional audits -- one pass per department per month (Finance, RM,
// F&B, Staff, ESG, Clients), each producing a 0-100 audit score, a
// letter grade, and a short list of findings/recommendations. Does not
// re-derive anything the business modules' own engines already
// computed -- reads the same "month snapshot" proEngine.js builds each
// month and only synthesizes it into an audit vocabulary.
import { safeNumber, safeObject } from "../safe";

function grade(score) {
  const value = safeNumber(score, 0);
  if (value >= 85) return "A";
  if (value >= 70) return "B";
  if (value >= 55) return "C";
  if (value >= 40) return "D";
  return "F";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function auditEntry(department, score, findings) {
  return { department, score: Math.round(clamp(score, 0, 100)), grade: grade(score), findings };
}

// snapshot: the month snapshot proEngine.js builds (finance/staff/
// marketing/esg/housekeeping/restaurantAdvanced/rmAdvanced/clients).
export function runProAudits(snapshot = {}) {
  const s = safeObject(snapshot);
  const audits = [];

  // Finance
  const ebitdaMargin = safeNumber(s.finance?.ebitdaMargin, 0);
  audits.push(
    auditEntry("finance", 50 + ebitdaMargin * 200, [
      ebitdaMargin < 0 ? "Marge EBITDA négative : revoir la structure de coûts." : "Marge EBITDA positive.",
      s.finance?.cash !== undefined && s.finance?.cash < 0 ? "Trésorerie négative : risque de tension de liquidité." : "Trésorerie sous contrôle.",
    ])
  );

  // RM (base + avancé) -- blends live occupancy with the RM Advanced
  // module's own direct-booking share (a healthier distribution mix).
  const rmScore = (safeNumber(s.occupancyRate, 0) + safeNumber(s.rmAdvanced?.directShare, 40)) / 2;
  audits.push(
    auditEntry("rm", rmScore, [
      `Occupation moyenne : ${safeNumber(s.occupancyRate, 0)}%.`,
      s.rmAdvanced?.otaShare > 60 ? "Forte dépendance OTA : marge de manœuvre sur la distribution directe." : "Mix de distribution équilibré.",
    ])
  );

  // F&B (restaurant avancé)
  const grossMargin = safeNumber(s.restaurantAdvanced?.grossMargin, 60);
  audits.push(
    auditEntry("fb", grossMargin, [
      `Marge brute F&B : ${grossMargin}%.`,
      safeNumber(s.restaurantAdvanced?.foodCost, 30) > 32 ? "Food cost élevé : revoir les fiches techniques ou les fournisseurs." : "Food cost maîtrisé.",
    ])
  );

  // Staff
  audits.push(
    auditEntry("staff", safeNumber(s.staff?.morale, 60), [
      `Moral d'équipe : ${safeNumber(s.staff?.morale, 60)}/100.`,
      safeNumber(s.staff?.overload, 0) > 70 ? "Surcharge de travail détectée." : "Charge de travail sous contrôle.",
    ])
  );

  // ESG
  audits.push(
    auditEntry("esg", safeNumber(s.esg?.score, 55), [
      `Score ESG : ${safeNumber(s.esg?.score, 55)}/100.`,
    ])
  );

  // Clients
  audits.push(
    auditEntry("clients", safeNumber(s.clients?.satisfaction, 65), [
      `Satisfaction clients : ${safeNumber(s.clients?.satisfaction, 65)}/100.`,
      safeNumber(s.clients?.loyalty, 50) < 40 ? "Fidélité clients faible : envisager un programme de fidélisation." : "Fidélité clients correcte.",
    ])
  );

  return audits;
}

export function overallAuditScore(audits = []) {
  const list = Array.isArray(audits) ? audits : [];
  if (!list.length) return null;
  return Math.round(list.reduce((sum, audit) => sum + safeNumber(audit.score, 0), 0) / list.length);
}

export const proAudits = { runProAudits, overallAuditScore };
export default proAudits;
