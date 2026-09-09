import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

// One top-bar menu: a plain link when it has no children (e.g.
// "Dashboard"), or a click-to-open dropdown otherwise (e.g. "Hôtel" ->
// Chambres/Housekeeping/Clients). Click-based rather than hover-based so
// it works the same on touch devices and is trivially testable (no
// pointer-enter simulation needed). `align="right"` opens the menu
// leftward instead of rightward -- used by the last couple of items so
// the dropdown never overflows past the viewport's right edge ("ne
// déborde jamais du cadre").
//
// `icon` (trigger) and each item's own `icon`/`description` are optional,
// purely additive visuals for the game-styled hub navigation (see
// ui/navigation/GameNavigation.jsx) -- every icon is aria-hidden and, when
// an item has a description, its accessible name is pinned to `item.label`
// via aria-label, so existing callers/tests that only ever passed
// `{label, to}` keep exactly the same rendered accessible name and click
// behaviour as before.
export default function TopBarDropdown({ label, to, items, align = "left", icon }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
      isActive ? "bg-cyan-700 text-white" : "text-slate-200 hover:bg-slate-800 hover:text-white"
    }`;

  // A plain link -- no dropdown to manage.
  if (!items || items.length === 0) {
    return (
      <NavLink to={to} end className={linkClass}>
        {icon && <span aria-hidden="true" className="mr-1">{icon}</span>}
        {label}
      </NavLink>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
          open ? "bg-slate-800 text-white" : "text-slate-200 hover:bg-slate-800 hover:text-white"
        }`}
      >
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.19l3.71-3.96a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Floating, not in-flow: position:absolute (with the wrapper above
          as its `relative` containing block) takes this panel out of the
          document flow entirely, so opening it never pushes any other
          top-bar item or page content down. max-height + overflow-y:auto
          caps how tall it can ever get (a long sub-menu scrolls inside
          itself instead of growing the panel, which -- absolutely
          positioned or not -- would otherwise still be able to extend the
          page's own scrollable area past the viewport). z-[9999] keeps it
          above every other layer in the app (modals aside). The
          fade+slide (opacity + a small -translate-y when closed) is the
          "légère" open animation asked for. */}
      <div
        role="menu"
        aria-label={label}
        hidden={!open}
        className={`absolute top-full z-[9999] mt-1 max-h-[300px] w-52 origin-top overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg transition-all duration-150 ${
          align === "right" ? "right-0" : "left-0"
        } ${open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
      >
        {items.map((item) => (
          <NavLink
            key={`${label}-${item.label}`}
            to={item.to}
            role="menuitem"
            aria-label={item.description ? item.label : undefined}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                isActive ? "bg-cyan-50 font-medium text-cyan-700" : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            {item.icon && <span aria-hidden="true">{item.icon}</span>}
            <span className="flex-1">
              <span className="block">{item.label}</span>
              {item.description && <span className="block text-xs font-normal text-slate-400">{item.description}</span>}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
