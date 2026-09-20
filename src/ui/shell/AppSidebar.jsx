import { Link, useLocation } from "react-router-dom";

const startsWith = (pathname, prefixes) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

// The five modules the player works in, each with its own tone. `to` may carry
// a hash: Dashboard.jsx reads it to scroll to the hotel plan (#hotel-plan) or
// open the yield & marketing desk (#yield). `isActive` looks at the pathname
// AND the hash, because several entries share the /dashboard page.
export const SIDEBAR_ITEMS = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: "📊",
    to: "/dashboard",
    tone: "action",
    isActive: ({ pathname, hash }) => pathname === "/dashboard" && hash !== "#hotel-plan" && hash !== "#yield",
  },
  {
    id: "hotel",
    label: "Exploitation & Plan",
    icon: "🏨",
    to: "/dashboard#hotel-plan",
    tone: "success",
    isActive: ({ pathname, hash }) => (pathname === "/dashboard" && hash === "#hotel-plan") || startsWith(pathname, ["/hotel", "/rooms", "/housekeeping", "/expansion"]),
  },
  {
    id: "vip",
    label: "Avis & Clients VIP",
    icon: "👥",
    to: "/clients/reviews",
    tone: "vip",
    isActive: ({ pathname }) => startsWith(pathname, ["/clients", "/corporate"]),
  },
  {
    id: "yield",
    label: "Yield & Marketing",
    icon: "📈",
    to: "/dashboard#yield",
    tone: "mice",
    isActive: ({ pathname, hash }) => (pathname === "/dashboard" && hash === "#yield") || startsWith(pathname, ["/marketing", "/rm-advanced", "/rm-dashboard"]),
  },
  {
    id: "management",
    label: "RH & Maintenance",
    icon: "⚙️",
    to: "/management",
    tone: "action",
    isActive: ({ pathname }) => startsWith(pathname, ["/management", "/staff"]),
  },
];

// The main navigation rail: a vertical sidebar on wide screens, a scrolling
// strip of the same links above the page on narrow ones (one DOM either way).
// The top bar's hub menus stay for everything else.
export default function AppSidebar() {
  const location = useLocation();

  return (
    <nav
      aria-label="Modules de l'hôtel"
      data-testid="app-sidebar"
      className="flex gap-1 overflow-x-auto border-b border-slate-200/80 bg-white px-3 py-2 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-60 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-3"
    >
      <p className="hidden px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400 lg:block">Modules</p>
      {SIDEBAR_ITEMS.map((item) => {
        const active = item.isActive(location);
        return (
          <Link
            key={item.id}
            to={item.to}
            data-tone={item.tone}
            data-testid={`sidebar-${item.id}`}
            aria-current={active ? "page" : undefined}
            className="sidebar-link shrink-0 lg:shrink"
          >
            <span aria-hidden="true" className="sidebar-link__icon">{item.icon}</span>
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
