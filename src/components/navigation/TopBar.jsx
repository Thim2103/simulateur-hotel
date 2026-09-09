import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import TopBarDropdown from "./TopBarDropdown";

// The 9 primary menus asked for, in order, each with the sub-menu items
// specified. A plain link (no `items`) renders without a dropdown (see
// TopBarDropdown.jsx). Where the spec names a sub-page that doesn't exist
// as its own route (RM's Pricing/Forecast/Segments, ESG's Énergie/
// Déchets/Eau), the item deep-links to the existing page's matching
// section by id when one exists (RM -> /rm-dashboard#rm-pricing etc.,
// see RMDashboard.jsx) or to the page itself otherwise -- no dead links,
// but not every item is its own route. Finance's Revenus/Charges/Bilan/
// Cash-flow, Staff's RH/Planning/Productivité, Marketing's Campagnes/
// Canaux and ESG's Certifications DO each have their own routes (see
// pages/FinanceDashboard.jsx/FinanceReport.jsx/FinanceForecast.jsx,
// pages/StaffDashboard.jsx/StaffReport.jsx/StaffForecast.jsx,
// pages/MarketingCampaigns.jsx/MarketingChannels.jsx and
// pages/EsgCertifications.jsx -- Marketing's "ROI" item stays on
// /marketing itself, which already leads with the ROI KPI).
const PRIMARY_MENUS = [
  { label: "Dashboard", to: "/dashboard" },
  {
    label: "Hôtel",
    items: [
      { label: "Chambres", to: "/rooms" },
      { label: "Housekeeping", to: "/housekeeping" },
      { label: "Clients", to: "/clients" },
      { label: "Segments", to: "/clients/segments" },
      { label: "Avis", to: "/clients/reviews" },
    ],
  },
  {
    label: "Restaurant",
    items: [
      { label: "Menu", to: "/restaurant/menu" },
      { label: "Staff", to: "/restaurant/hr" },
      { label: "Finance", to: "/restaurant/finance" },
      { label: "Opérations", to: "/restaurant/operations" },
    ],
  },
  {
    label: "RM",
    items: [
      { label: "Pricing", to: "/rm-dashboard#rm-pricing" },
      { label: "Forecast", to: "/rm-dashboard#rm-forecast" },
      { label: "Segments", to: "/rm-dashboard#rm-segmentation" },
    ],
  },
  {
    label: "PMS",
    items: [
      { label: "Réservations", to: "/reservations" },
      { label: "Clients", to: "/clients" },
      { label: "Planning", to: "/pms" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Revenus", to: "/finance" },
      { label: "Charges", to: "/finance" },
      { label: "Bilan", to: "/finance/report" },
      { label: "Cash-flow", to: "/finance/forecast" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Campagnes", to: "/marketing/campaigns" },
      { label: "Canaux", to: "/marketing/channels" },
      { label: "ROI", to: "/marketing" },
    ],
  },
  {
    label: "Staff",
    items: [
      { label: "RH", to: "/staff" },
      { label: "Planning", to: "/staff/forecast" },
      { label: "Productivité", to: "/staff/report" },
    ],
  },
  {
    label: "ESG",
    items: [
      { label: "Énergie", to: "/esg" },
      { label: "Déchets", to: "/esg" },
      { label: "Eau", to: "/esg" },
      { label: "Certifications", to: "/esg/certifications" },
    ],
    align: "right",
  },
];

// Everything that was reachable from the old vertical Sidebar.jsx but
// isn't one of the 9 spec'd menus above (Career/Guest Mode/multi-hotel
// Chain/Expansion/Progression) -- kept one click away instead of being
// orphaned, same "hidden but functional" treatment the Academy/
// Competition/Replay/Analytics routes already got (see Sidebar.jsx's own
// former header comment). Every route it points to stays mounted in
// App.js.
const MORE_MENU_ITEMS = [
  { label: "Mode Carrière", to: "/career" },
  { label: "Mode Invité", to: "/guest" },
  { label: "Mode TFE Solo", to: "/tfe" },
  { label: "Chaîne d'hôtels", to: "/chain" },
  { label: "RH multi-sites", to: "/chain/staff" },
  { label: "Progression", to: "/progression" },
  { label: "Expansion", to: "/expansion" },
  { label: "Retour au menu principal", to: "/menu" },
];

// Replaces layout/Sidebar.jsx: a horizontal bar instead of a vertical
// rail. Collapses into a hamburger-triggered stacked menu below md so it
// never overflows its own frame on a narrow viewport.
export default function TopBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950 text-white">
      {/* No overflow-x-hidden here: setting it would force the browser to
          compute overflow-y as "auto" too (per the CSS overflow spec, an
          axis left "visible" while the other is constrained becomes
          "auto"), turning this row into its own scroll container and
          clipping/scrolling the dropdown panels (position:absolute,
          anchored to a `relative` wrapper *inside* this row) instead of
          letting them float freely above the page -- exactly the "menus
          push the page down" bug this fixes. Horizontal safety at
          in-between widths comes from the md: breakpoint switch to the
          hamburger menu below, not from clipping this row. */}
      <div className="mx-auto flex h-14 max-w-full items-center gap-2 px-3 sm:px-4">
        <Link to="/" className="mr-2 shrink-0 text-sm font-bold tracking-tight text-cyan-400">
          Hospitality Lab
        </Link>

        <nav aria-label="Navigation principale" className="hidden flex-1 items-center gap-1 md:flex">
          {PRIMARY_MENUS.map((menu) => (
            <TopBarDropdown key={menu.label} label={menu.label} to={menu.to} items={menu.items} align={menu.align} />
          ))}
        </nav>

        <div className="hidden md:block">
          <TopBarDropdown label="Plus" items={MORE_MENU_ITEMS} align="right" />
        </div>

        <button
          type="button"
          className="ml-auto rounded-md p-2 text-slate-200 hover:bg-slate-800 md:hidden"
          aria-expanded={mobileOpen}
          aria-label="Ouvrir la navigation"
          onClick={() => setMobileOpen((value) => !value)}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            {mobileOpen ? (
              <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zM2.75 14a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75z" clipRule="evenodd" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <nav aria-label="Navigation principale (mobile)" className="flex flex-col gap-1 border-t border-slate-800 bg-slate-950 px-3 py-2 md:hidden">
          {[...PRIMARY_MENUS, { label: "Plus", items: MORE_MENU_ITEMS }].map((menu) =>
            menu.items ? (
              <div key={menu.label} className="flex flex-col gap-1">
                <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{menu.label}</p>
                {menu.items.map((item) => (
                  <NavLink
                    key={`${menu.label}-${item.label}`}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `rounded-md px-3 py-2 text-sm ${isActive ? "bg-cyan-700 text-white" : "text-slate-200 hover:bg-slate-800"}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ) : (
              <NavLink
                key={menu.label}
                to={menu.to}
                end
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-cyan-700 text-white" : "text-slate-200 hover:bg-slate-800"}`
                }
              >
                {menu.label}
              </NavLink>
            )
          )}
        </nav>
      )}
    </header>
  );
}
