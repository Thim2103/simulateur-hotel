// A tiny pub/sub so any page (pages/Dashboard.jsx's "Radial Navigation"
// button, ui/gmDesk/GmDesk.jsx's "Retour à la navigation" button) can open
// the one RadialNavigation instance Layout.jsx already mounts globally,
// without prop-drilling its open/close state through every page or
// standing up a whole context provider for two call sites. Plain module-
// level state (not React state) on purpose: RadialNavigation.jsx is the
// only component that ever *reads* it (via subscribe()), everyone else
// only ever calls open().
const listeners = new Set();

export function openRadialNav() {
  listeners.forEach((listener) => listener());
}

export function subscribeRadialNavOpen(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const radialNavBus = { openRadialNav, subscribeRadialNavOpen };
export default radialNavBus;
