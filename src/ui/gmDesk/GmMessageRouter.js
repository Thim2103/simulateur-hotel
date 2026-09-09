// Routes a GM Desk message to its business module: which page to open,
// and which real `applyXDecision(hotelBundle, actionId, payload)` function
// (every business module exposes exactly this contract -- see
// lib/staff/staffActions.js, lib/housekeeping/housekeepingActions.js,
// lib/finance/financeEngine.js, lib/esg/esgActions.js,
// lib/marketing/marketingActions.js, lib/rmAdvanced/rmAdvancedActions.js,
// lib/restaurantAdvanced/restaurantActions.js,
// lib/clients/clientsActions.js) actually applies its decision. Pro
// ("career" for owner-level Mode Professionnel messages) and generic
// "career" messages go through useProEngine.js's applyProAction() /
// useDashboard.js's applyQuickAction() instead, which is why
// applyDecision() takes those two appliers in as a small `context` object
// rather than importing hooks itself -- this module stays a plain,
// testable function, the React wiring lives in GmDeskProvider.jsx.
import { applyStaffDecision } from "../../lib/staff/staffActions";
import { applyHousekeepingDecision } from "../../lib/housekeeping/housekeepingActions";
import { applyFinancialDecision } from "../../lib/finance/financeEngine";
import { applyEsgDecision } from "../../lib/esg/esgActions";
import { applyMarketingDecision } from "../../lib/marketing/marketingActions";
import { applyRmAdvancedDecision } from "../../lib/rmAdvanced/rmAdvancedActions";
import { applyRestaurantAdvancedDecision } from "../../lib/restaurantAdvanced/restaurantActions";
import { applyClientsDecision } from "../../lib/clients/clientsActions";
import { applyQuickAction } from "../../lib/dashboard/dashboardActions";
import { messageTypeMeta } from "./GmMessageTypes";

// module -> the page the "Ouvrir le module" link/GmMessageRouter's
// openModuleForMessage() sends the player to.
const MODULE_ROUTE = {
  staff: "/staff",
  housekeeping: "/housekeeping",
  restaurantAdvanced: "/restaurant/menu-engineering",
  finance: "/finance",
  marketing: "/marketing",
  rmAdvanced: "/rm-advanced",
  esg: "/esg",
  clients: "/clients",
  pro: "/pro/dashboard",
  career: "/dashboard",
};

// module -> the real `(hotelBundle, actionId, payload) => hotelBundle`
// applier -- every one of these is driven through useCareer.js's
// applyHotelAdjustment() (see lib/dashboard/dashboardActions.js's own
// applyQuickAction() for the same contract, already wired that way from
// pages/Dashboard.jsx).
const MODULE_APPLIER = {
  staff: applyStaffDecision,
  housekeeping: applyHousekeepingDecision,
  restaurantAdvanced: applyRestaurantAdvancedDecision,
  finance: applyFinancialDecision,
  marketing: applyMarketingDecision,
  rmAdvanced: applyRmAdvancedDecision,
  esg: applyEsgDecision,
  clients: applyClientsDecision,
  career: applyQuickAction,
};

// Which module a message type belongs to -- GM_MESSAGE_TYPES already
// carries this, this is just a friendlier name for it (mapMessageToAction,
// as asked for) at the type level rather than the message-instance level.
export function mapMessageToAction(messageType) {
  return messageTypeMeta(messageType).module;
}

export function openModuleForMessage(message) {
  return MODULE_ROUTE[message?.module] || MODULE_ROUTE.career;
}

// Applies one of a message's decisions. `context.applyHotelAdjustment`
// (see hooks/useCareer.js) drives every hotelBundle-based module;
// `context.applyProAction` (see hooks/useProEngine.js) drives Mode
// Professionnel Solo messages instead, since Pro owns its own
// self-contained CareerState (see lib/pro/proEngine.js's own docstring)
// rather than the player's shared one.
export async function applyDecision(message, actionId, context = {}) {
  if (message?.module === "pro") {
    if (!context.applyProAction) throw new Error("applyDecision: contexte Pro manquant (applyProAction).");
    return context.applyProAction(actionId);
  }

  const applier = MODULE_APPLIER[message?.module];
  if (!applier) throw new Error(`applyDecision: aucun module métier pour "${message?.module}".`);
  if (!context.applyHotelAdjustment) throw new Error("applyDecision: contexte manquant (applyHotelAdjustment).");
  return context.applyHotelAdjustment((hotelBundle) => applier(hotelBundle, actionId));
}

const GmMessageRouter = { mapMessageToAction, openModuleForMessage, applyDecision };
export default GmMessageRouter;
