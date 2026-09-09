import { Link } from "react-router-dom";
import { isDesktopBuild } from "../lib/env";

// The very first screen (route: /menu) -- title, and the entry points
// into the rest of the app. Full-bleed (see layout/Layout.jsx's
// FULL_BLEED_ROUTES): no top-bar here, there's no hotel to navigate to
// yet.
export default function MainMenu() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 animate-[pulse_6s_ease-in-out_infinite] bg-gradient-to-br from-cyan-900/40 via-slate-950 to-slate-900" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-cyan-700/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 animate-[pulse_10s_ease-in-out_infinite] rounded-full bg-amber-600/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-10 px-6 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-400">Simulateur de gestion hôtelière</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">Hospitality Lab</h1>
          <p className="mt-2 text-sm font-medium text-slate-400">Build it. Run it. Master it.</p>
        </div>

        <nav aria-label="Menu principal" className="flex w-64 flex-col gap-3">
          <Link to="/play" className="rounded-lg bg-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all duration-150 hover:-translate-y-0.5 hover:bg-cyan-500">
            Jouer
          </Link>
          <Link to="/options" className="rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-800">
            Options
          </Link>
          <Link to="/credits" className="rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-800">
            Crédits
          </Link>
          {isDesktopBuild() && (
            <button
              type="button"
              onClick={() => window.close()}
              className="rounded-lg border border-slate-800 px-6 py-3 text-sm font-semibold text-slate-400 transition-all duration-150 hover:-translate-y-0.5 hover:text-slate-200"
            >
              Quitter
            </button>
          )}
        </nav>

        <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
          <section aria-labelledby="main-menu-new-game" className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left">
            <h2 id="main-menu-new-game" className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Nouvelle partie</h2>
            <Link to="/career" className="rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800">🎮 Carrière</Link>
            <Link to="/sandbox" className="rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800">🏗 Sandbox</Link>
            <Link to="/challenges" className="rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800">⚡ Défis</Link>
            <Link to="/scenarios" className="rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800">🧪 Scénarios</Link>
          </section>
          <section aria-labelledby="main-menu-academy" className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left">
            <h2 id="main-menu-academy" className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Académie</h2>
            <Link to="/academy" className="rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800">🎓 Academy</Link>
            <Link to="/tfe" className="rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800">📚 TFE / Case Study</Link>
            <Link to="/competition" className="rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800">🏆 Compétition</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
