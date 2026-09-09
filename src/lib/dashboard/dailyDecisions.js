// Groups the Dashboard's own quick-action catalog (see dashboardActions.js)
// by theme for "DecisionsPanel" -- Pricing / Staff / Marketing /
// Restaurant / ESG, matching how the rest of the app is already organized
// (RM, Staff, Marketing, Restaurant, ESG modules). Every action here still
// runs through the exact same applyQuickAction() as before; this is only a
// presentation grouping, not a new action system.
import { safeArray } from "../safe";

export const DECISION_THEMES = [
  { id: "pricing", label: "Pricing", categories: ["pricing"], moduleLink: "/rm-dashboard" },
  { id: "staff", label: "Staff", categories: ["staff"], moduleLink: "/staff" },
  { id: "marketing", label: "Marketing", categories: ["marketing"], moduleLink: "/marketing" },
  { id: "restaurant", label: "Restaurant", categories: ["operations"], moduleLink: "/restaurant/menu" },
];

// Returns only the themes that actually have at least one action in
// `quickActions` -- avoids showing an empty "ESG" group just because the
// catalog doesn't have an ESG quick action yet.
export function buildDecisionGroups(quickActions) {
  const actions = safeArray(quickActions);
  return DECISION_THEMES.map((theme) => ({
    ...theme,
    actions: actions.filter((action) => theme.categories.includes(action.category)),
  })).filter((group) => group.actions.length > 0);
}

export default buildDecisionGroups;
