import { Link } from "react-router-dom";

const MODES = [
  { label: "Mode Solo", to: "/solo", description: "Prenez en main un hôtel et progressez à votre rythme." },
  { label: "Carrière", to: "/career", description: "Missions, objectifs, storyline et récompenses." },
  { label: "Sandbox", to: "/sandbox", description: "Jouez librement, sans objectifs ni sauvegarde." },
  { label: "Scénarios", to: "/scenarios", description: "Un défi ciblé, avec ses propres objectifs et contraintes." },
  { label: "Challenges", to: "/challenges", description: "Affrontez d'autres joueurs sur le même scénario." },
];

// Route: /select-mode -- reached after PlayMenu.jsx's login/signup/guest
// flow. Each card links to a real, already-wired mode: see each
// destination page's own docstring for how it's implemented.
export default function SelectMode() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 px-6 py-10 text-white">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">Hospitality Lab</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Choisissez votre mode de jeu</h1>
      </div>

      <nav aria-label="Modes de jeu" className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {MODES.map((option) => (
          <Link
            key={option.to}
            to={option.to}
            className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-700 hover:bg-slate-900"
          >
            <span className="text-base font-semibold text-white">{option.label}</span>
            <span className="text-sm text-slate-400">{option.description}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
