// The 13 message types the GM Desk inbox can show. Each carries its own
// icon (see ui/designSystem/icons.js's pack -- reused where a fitting
// icon already exists), a default severity/color ("high"/"medium"/"low",
// the same vocabulary AttentionPanel/GameBadge already use), a short
// title, and the business module it belongs to -- which is what
// GmMessageRouter.js uses to pick the right action catalog/applier and
// route ("ouvrir Staff/Housekeeping", "ouvrir RM Advanced", etc.).
export const GM_MESSAGE_TYPES = {
  HR_REQUEST: { icon: "🧑‍💼", color: "medium", title: "Demande RH", module: "staff" },
  STAFF_ALERT: { icon: "👔", color: "high", title: "Alerte Personnel", module: "staff" },
  HOUSEKEEPING_OVERLOAD: { icon: "🧹", color: "high", title: "Surcharge Housekeeping", module: "housekeeping" },
  RESTAURANT_MENU_PROPOSAL: { icon: "🍽️", color: "low", title: "Proposition Restaurant", module: "restaurantAdvanced" },
  FINANCE_WARNING: { icon: "💰", color: "high", title: "Alerte Finance", module: "finance" },
  MARKETING_CAMPAIGN_END: { icon: "📣", color: "medium", title: "Marketing", module: "marketing" },
  RM_DEMAND_SPIKE: { icon: "📈", color: "low", title: "Pic de demande", module: "rmAdvanced" },
  RM_DISPLACEMENT_ALERT: { icon: "📉", color: "medium", title: "Alerte Displacement", module: "rmAdvanced" },
  ESG_CERTIFICATION: { icon: "🌱", color: "low", title: "ESG", module: "esg" },
  CLIENTS_COMPLAINT: { icon: "👥", color: "high", title: "Réclamation client", module: "clients" },
  OWNER_REQUEST: { icon: "🏛️", color: "medium", title: "Demande du propriétaire", module: "pro" },
  INCIDENT_BREAKDOWN: { icon: "❗", color: "high", title: "Incident", module: "career" },
  OPPORTUNITY_EVENT: { icon: "✨", color: "low", title: "Opportunité", module: "career" },
};

export function messageTypeMeta(type) {
  return GM_MESSAGE_TYPES[type] || { icon: "✉️", color: "medium", title: "Message", module: "career" };
}

export default GM_MESSAGE_TYPES;
