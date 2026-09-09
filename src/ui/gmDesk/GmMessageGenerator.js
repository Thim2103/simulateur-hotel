// Builds GM Desk messages from real, already-computed state -- never a
// new simulation of its own. Every generator function here is pure
// (state in, messages out), same contract as lib/dashboard/attentionItems.js
// (which this deliberately parallels: same {type, severity, message}
// diagnostics vocabulary, but classified into one of the 13
// GM_MESSAGE_TYPES and given a matching action list, since a GM Desk
// message needs an actual decision, not just a link).
import { safeArray } from "../../lib/safe";
import { staffFromCareerState } from "../../lib/staff/staffEngine";
import { housekeepingFromCareerState } from "../../lib/housekeeping/housekeepingEngine";
import { financeFromCareerState } from "../../lib/finance/financeEngine";
import { esgFromCareerState } from "../../lib/esg/esgEngine";
import { marketingFromCareerState } from "../../lib/marketing/marketingEngine";
import { restaurantAdvancedFromCareerState } from "../../lib/restaurantAdvanced/restaurantAdvancedEngine";
import { rmAdvancedFromCareerState } from "../../lib/rmAdvanced/rmAdvancedEngine";
import { clientsFromCareerState } from "../../lib/clients/clientsEngine";
import { STAFF_ACTION_CATALOG } from "../../lib/staff/staffActions";
import { HOUSEKEEPING_ACTION_CATALOG } from "../../lib/housekeeping/housekeepingActions";
import { FINANCE_ACTION_CATALOG } from "../../lib/finance/financeEngine";
import { ESG_ACTION_CATALOG } from "../../lib/esg/esgActions";
import { MARKETING_ACTION_CATALOG } from "../../lib/marketing/marketingActions";
import { RM_ADVANCED_ACTION_CATALOG } from "../../lib/rmAdvanced/rmAdvancedActions";
import { RESTAURANT_ACTION_CATALOG } from "../../lib/restaurantAdvanced/restaurantActions";
import { CLIENTS_ACTION_CATALOG } from "../../lib/clients/clientsActions";
import { QUICK_ACTION_CATALOG } from "../../lib/dashboard/dashboardActions";
import { PRO_ACTION_CATALOG } from "../../lib/pro/proActions";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
const MAX_ACTIONS = 4;

function actionsFor(catalog, count = 3) {
  return catalog.slice(0, count).map(({ id, label, description }) => ({ id, label, description }));
}

let sequence = 0;
function nextId(prefix) {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

function messageFromDiagnostic({ type, module, diagnostic, actions, title }) {
  return {
    id: nextId(type),
    type,
    title: title || diagnostic.message,
    description: diagnostic.message,
    severity: diagnostic.severity || "medium",
    module,
    source: "diagnostics",
    actions: actions.slice(0, MAX_ACTIONS),
    createdAt: new Date().toISOString(),
  };
}

// Every module's own diagnostics (see each *FromCareerState() adapter --
// the same ones dashboardEngine.js/proEngine.js already read), the most
// severe 1-2 per module, each classified into its GM message type and
// given a short menu of that module's own real decisions.
export function generateFromCareerState(careerState) {
  if (!careerState?.hotel) return [];
  const messages = [];

  const topDiagnostics = (diagnostics, limit = 2) =>
    safeArray(diagnostics)
      .slice()
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3))
      .slice(0, limit);

  const staff = staffFromCareerState(careerState);
  topDiagnostics(staff.diagnostics).forEach((diagnostic) => {
    messages.push(
      messageFromDiagnostic({
        type: diagnostic.type === "opportunity" ? "HR_REQUEST" : "STAFF_ALERT",
        module: "staff",
        diagnostic,
        actions: actionsFor(STAFF_ACTION_CATALOG),
      })
    );
  });

  const housekeeping = housekeepingFromCareerState(careerState);
  topDiagnostics(housekeeping.diagnostics, 1).forEach((diagnostic) => {
    messages.push(
      messageFromDiagnostic({ type: "HOUSEKEEPING_OVERLOAD", module: "housekeeping", diagnostic, actions: actionsFor(HOUSEKEEPING_ACTION_CATALOG) })
    );
  });

  const finance = financeFromCareerState(careerState);
  topDiagnostics(finance.diagnostics, 1).forEach((diagnostic) => {
    messages.push(messageFromDiagnostic({ type: "FINANCE_WARNING", module: "finance", diagnostic, actions: actionsFor(FINANCE_ACTION_CATALOG) }));
  });

  const esg = esgFromCareerState(careerState);
  topDiagnostics(esg.diagnostics, 1).forEach((diagnostic) => {
    messages.push(messageFromDiagnostic({ type: "ESG_CERTIFICATION", module: "esg", diagnostic, actions: actionsFor(ESG_ACTION_CATALOG) }));
  });

  const marketing = marketingFromCareerState(careerState);
  topDiagnostics(marketing.diagnostics, 1).forEach((diagnostic) => {
    messages.push(messageFromDiagnostic({ type: "MARKETING_CAMPAIGN_END", module: "marketing", diagnostic, actions: actionsFor(MARKETING_ACTION_CATALOG) }));
  });

  const restaurantAdvanced = restaurantAdvancedFromCareerState(careerState);
  topDiagnostics(restaurantAdvanced.diagnostics, 1).forEach((diagnostic) => {
    messages.push(
      messageFromDiagnostic({ type: "RESTAURANT_MENU_PROPOSAL", module: "restaurantAdvanced", diagnostic, actions: actionsFor(RESTAURANT_ACTION_CATALOG) })
    );
  });

  const clients = clientsFromCareerState(careerState);
  topDiagnostics(clients.diagnostics, 1).forEach((diagnostic) => {
    messages.push(messageFromDiagnostic({ type: "CLIENTS_COMPLAINT", module: "clients", diagnostic, actions: actionsFor(CLIENTS_ACTION_CATALOG) }));
  });

  const rmAdvanced = rmAdvancedFromCareerState(careerState);
  topDiagnostics(rmAdvanced.diagnostics, 2).forEach((diagnostic) => {
    const isDisplacement = /displacement|perte|compression/i.test(diagnostic.message);
    messages.push(
      messageFromDiagnostic({
        type: isDisplacement ? "RM_DISPLACEMENT_ALERT" : "RM_DEMAND_SPIKE",
        module: "rmAdvanced",
        diagnostic,
        actions: actionsFor(RM_ADVANCED_ACTION_CATALOG),
      })
    );
  });

  return messages;
}

// Owner-level messages from the Mode Professionnel Solo run (see
// lib/pro/proState.js) -- active crises become OWNER_REQUEST (the owner
// wants to know what the GM is doing about it), available opportunities
// become OPPORTUNITY_EVENT.
export function generateFromProState(proState) {
  if (!proState) return [];
  const messages = [];

  safeArray(proState.crises)
    .filter((crisis) => crisis.active)
    .forEach((crisis) => {
      messages.push({
        id: nextId("OWNER_REQUEST"),
        type: "OWNER_REQUEST",
        title: crisis.title || "Le propriétaire s'inquiète",
        description: crisis.description || `Crise en cours : ${crisis.title}.`,
        severity: "high",
        module: "pro",
        source: "pro",
        actions: actionsFor(PRO_ACTION_CATALOG),
        createdAt: new Date().toISOString(),
      });
    });

  safeArray(proState.opportunities)
    .filter((opportunity) => !opportunity.seized && opportunity.active !== false)
    .forEach((opportunity) => {
      messages.push({
        id: nextId("OPPORTUNITY_EVENT"),
        type: "OPPORTUNITY_EVENT",
        title: opportunity.title || "Opportunité disponible",
        description: opportunity.description || `Opportunité : ${opportunity.title}.`,
        severity: "low",
        module: "pro",
        source: "pro",
        actions: actionsFor(PRO_ACTION_CATALOG),
        createdAt: new Date().toISOString(),
      });
    });

  return messages;
}

const INCIDENT_EVENT_IDS = new Set(["power-outage", "staff-strike", "health-inspection", "technical-incidents"]);
const OPPORTUNITY_EVENT_IDS = new Set(["vip-guest", "local-events", "customer-reviews"]);

// Today's scenario events (see replayEngine.js's eventsForCycle(), the
// same real event catalogue as ui/hotelView/v2/HotelEventsLayer.jsx),
// classified into INCIDENT_BREAKDOWN / OPPORTUNITY_EVENT.
export function generateFromReplay(replayEvents) {
  return safeArray(replayEvents).map((event) => {
    const isIncident = INCIDENT_EVENT_IDS.has(event.id) || event.severity === "high";
    const type = OPPORTUNITY_EVENT_IDS.has(event.id) && !isIncident ? "OPPORTUNITY_EVENT" : isIncident ? "INCIDENT_BREAKDOWN" : "OPPORTUNITY_EVENT";
    return {
      id: nextId(type),
      type,
      title: event.name || event.message,
      description: event.message || event.name,
      severity: event.severity || "medium",
      module: "career",
      source: "replay",
      actions: actionsFor(QUICK_ACTION_CATALOG),
      createdAt: new Date().toISOString(),
    };
  });
}

const INCIDENT_TEMPLATES = [
  { title: "Panne technique", description: "Un équipement est tombé en panne et demande une intervention." },
  { title: "Fuite d'eau", description: "Une fuite a été signalée dans les parties communes." },
];
const OPPORTUNITY_TEMPLATES = [
  { title: "Groupe surprise", description: "Un groupe intéressé par un séjour de dernière minute vient de contacter la réception." },
  { title: "Partenariat local", description: "Un commerce local propose un partenariat promotionnel." },
];

function pickTemplate(templates, rng) {
  return templates[Math.floor(rng() * templates.length)];
}

// Synthetic, template-based messages for when there's nothing in the real
// diagnostics/events to show yet (e.g. a brand-new career, day 1) -- kept
// separate from generateFromCareerState()/generateFromReplay() so callers
// can choose whether to use them (GmDeskProvider.jsx only reaches for
// these as a fallback, never mixed in with real diagnostics).
export function generateIncident(rng = Math.random) {
  const template = pickTemplate(INCIDENT_TEMPLATES, rng);
  return {
    id: nextId("INCIDENT_BREAKDOWN"),
    type: "INCIDENT_BREAKDOWN",
    title: template.title,
    description: template.description,
    severity: "high",
    module: "career",
    source: "generated",
    actions: actionsFor(QUICK_ACTION_CATALOG),
    createdAt: new Date().toISOString(),
  };
}

export function generateRandomOpportunity(rng = Math.random) {
  const template = pickTemplate(OPPORTUNITY_TEMPLATES, rng);
  return {
    id: nextId("OPPORTUNITY_EVENT"),
    type: "OPPORTUNITY_EVENT",
    title: template.title,
    description: template.description,
    severity: "low",
    module: "career",
    source: "generated",
    actions: actionsFor(QUICK_ACTION_CATALOG),
    createdAt: new Date().toISOString(),
  };
}

const GmMessageGenerator = {
  generateFromCareerState,
  generateFromProState,
  generateFromReplay,
  generateIncident,
  generateRandomOpportunity,
};
export default GmMessageGenerator;
