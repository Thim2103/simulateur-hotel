// The redesigned "navigation en hubs": Layout.jsx renders this (not
// components/navigation/TopBar.jsx directly) as the app's real navigation.
//
// It re-exports TopBar.jsx rather than duplicating it: TopBar.jsx *is* the
// hub navigation the spec asks for (Hôtel/Restaurant/RM/PMS/Finance/
// Marketing/Staff/ESG/Mode Professionnel, each a hub button that opens a
// panel of icon-labelled sub-modules -- see TopBar.jsx/TopBarDropdown.jsx,
// now carrying the icon pack from ui/designSystem/icons.js). Forking a
// second, parallel implementation here would either drift from it or
// silently break the ~15 existing guest-flow integration tests and
// TopBar.test.jsx/TopBarDropdown.test.jsx that click through the current
// hub labels and DOM structure by role/name. See TopBar.jsx's own
// docstring for the full reasoning.
export { default } from "../../components/navigation/TopBar";
