import { useLocation } from "react-router-dom";
import RadialLayout from "../ui/radialNav/RadialLayout";
import ErrorBoundary from "../components/ErrorBoundary";

// Pre-game screens (see pages/MainMenu.jsx, PlayMenu.jsx, SelectMode.jsx,
// Options.jsx, Credits.jsx) render full-bleed, with no navigation -- there's
// no hotel to navigate yet at that point in the flow.
const FULL_BLEED_ROUTES = ["/menu", "/play", "/select-mode", "/options", "/credits"];

// Mounts RadialLayout.jsx (GameNavigation's detailed top-bar +
// RadialNavigation's floating circular launcher, see its own docstring)
// for every in-game page.
export default function Layout({ children }) {
  const { pathname } = useLocation();
  if (FULL_BLEED_ROUTES.includes(pathname)) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  return (
    <RadialLayout>
      <ErrorBoundary>{children}</ErrorBoundary>
    </RadialLayout>
  );
}
