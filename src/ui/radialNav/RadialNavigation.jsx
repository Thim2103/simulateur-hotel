import { useEffect, useState } from "react";
import RadialHub from "./RadialHub";
import RadialBranch from "./RadialBranch";
import { RADIAL_BRANCHES, branchPosition } from "./radialConfig";
import { subscribeRadialNavOpen } from "./radialNavBus";
import { fadeIn } from "../animations";

const RADIUS = 150;

// The Radial Navigation: a circular hub-and-branches menu (see
// radialConfig.js for the hub + 7 branches, radialAnimations.js/
// radialNav.css for the motion). Mounted once in layout/Layout.jsx as a
// small floating trigger, present on every in-game page; clicking it (or
// pressing the keyboard shortcut) opens a full-screen circular overlay --
// the hub in the centre, the 7 branches animating in around it.
//
// This coexists with GameNavigation.jsx (the detailed top-bar menus,
// Hôtel/Restaurant/RM/PMS/Finance/Marketing/Staff/ESG/Mode Professionnel,
// each with its own sub-pages) rather than replacing it outright: the
// radial menu's 7 branches are deliberately coarse (one route each, per
// the spec), so the ~50 individual pages those detailed dropdowns reach
// (RM Advanced's Compression/Displacement/Pick-up, Restaurant Advanced's
// Menu Engineering/Food Cost, ESG Certifications, every Mode Professionnel
// page, Career/Guest/Chain/TFE...) would otherwise become unreachable if
// GameNavigation were removed, and ~15 existing guest-flow integration
// tests + TopBar.test.jsx/TopBarDropdown.test.jsx click through its exact
// hub buttons by accessible name. GameNavigation stays the detailed menu;
// this is the fast, iconic "jump to a domain" launcher over it.
export default function RadialNavigation() {
  const [open, setOpen] = useState(false);

  // Lets any other page open this same instance (see radialNavBus.js) --
  // pages/Dashboard.jsx's "Radial Navigation" button and
  // ui/gmDesk/GmDesk.jsx's "Retour à la navigation" button both call
  // openRadialNav() rather than owning their own overlay.
  useEffect(() => subscribeRadialNavOpen(() => setOpen(true)), []);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Ouvrir la navigation radiale"
        className="fixed bottom-6 right-6 z-[9990] flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#e9ab1f] bg-[#0b1730] text-2xl text-white shadow-xl transition-transform duration-150 hover:scale-105"
      >
        <span aria-hidden="true">🎯</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation radiale"
          className={`fixed inset-0 z-[9995] flex items-center justify-center bg-slate-950/60 ${fadeIn}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="relative h-[380px] w-[380px]">
            <RadialHub onNavigate={close} />
            {RADIAL_BRANCHES.map((branch, index) => {
              const { x, y } = branchPosition(index, RADIAL_BRANCHES.length, RADIUS);
              return <RadialBranch key={branch.id} branch={branch} x={x} y={y} index={index} onNavigate={close} />;
            })}
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Fermer la navigation radiale"
            className="absolute right-6 top-6 z-[9996] rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
