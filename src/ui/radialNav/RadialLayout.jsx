import GameNavigation from "../navigation/GameNavigation";
import RadialNavigation from "./RadialNavigation";
import AppSidebar from "../shell/AppSidebar";
import StatusBar from "../shell/StatusBar";

// The global, in-game layout shell: GameNavigation's detailed top-bar
// menus + RadialNavigation's floating circular launcher (see its own
// docstring for why both coexist), the main-module sidebar and the status bar
// (treasury, date/season, occupancy, rating, notifications -- see
// ui/shell/), wrapping every in-game page's content.
// This is what layout/Layout.jsx mounts for every route except the
// full-bleed pre-game screens (MainMenu/PlayMenu/SelectMode/Options/
// Credits). RadialNavigation only ever renders a small fixed trigger button
// (and, once opened, a fixed full-screen overlay) that never sits inside the
// document flow, so it doesn't disturb the layout around it.
export default function RadialLayout({ children }) {
  return (
    <div className="min-h-screen">
      <GameNavigation />
      <RadialNavigation />
      <div className="lg:flex">
        <AppSidebar />
        <div className="min-w-0 flex-1">
          <StatusBar />
          <main className="min-w-0 bg-slate-50 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
