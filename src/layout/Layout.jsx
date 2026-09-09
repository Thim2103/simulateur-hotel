import { useLocation } from "react-router-dom";
import GameNavigation from "../ui/navigation/GameNavigation";
import ErrorBoundary from "../components/ErrorBoundary";

// Pre-game screens (see pages/MainMenu.jsx, PlayMenu.jsx, SelectMode.jsx,
// Options.jsx, Credits.jsx) render full-bleed, with no top-bar -- there's
// no hotel to navigate yet at that point in the flow.
const FULL_BLEED_ROUTES = ["/menu", "/play", "/select-mode", "/options", "/credits"];

// Replaces the vertical Sidebar.jsx with the horizontal TopBar.jsx (see
// components/navigation/TopBar.jsx) for every in-game page.
export default function Layout({ children }) {
  const { pathname } = useLocation();
  if (FULL_BLEED_ROUTES.includes(pathname)) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  return (
    <div className="min-h-screen">
      <GameNavigation />
      <main className="min-w-0 bg-slate-50 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
