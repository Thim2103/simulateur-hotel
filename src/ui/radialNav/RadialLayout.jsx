import GameNavigation from "../navigation/GameNavigation";
import RadialNavigation from "./RadialNavigation";

// The global, in-game layout shell: GameNavigation's detailed top-bar
// menus + RadialNavigation's floating circular launcher (see its own
// docstring for why both coexist), wrapping every in-game page's content.
// This is what layout/Layout.jsx mounts for every route except the
// full-bleed pre-game screens (MainMenu/PlayMenu/SelectMode/Options/
// Credits) -- same DOM shape Layout.jsx already had (a `min-h-screen`
// wrapper, the nav, then `<main>`), so this is additive: RadialNavigation
// only ever renders a small fixed trigger button (and, once opened, a
// fixed full-screen overlay) that never sits inside the document flow, so
// it doesn't disturb `<main>`'s own layout or GameNavigation's own DOM.
export default function RadialLayout({ children }) {
  return (
    <div className="min-h-screen">
      <GameNavigation />
      <RadialNavigation />
      <main className="min-w-0 bg-slate-50 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}
