import { Link } from "react-router-dom";
import GameCard from "../ui/components/GameCard";
import GameBadge from "../ui/components/GameBadge";
import { fadeIn, slideUp, delay } from "../ui/animations";

const MODES = [
  { label: "Mode Solo", to: "/solo", icon: "🧑‍💼", description: "Prenez en main un hôtel et progressez à votre rythme.", difficulty: "Facile", duration: "Libre" },
  { label: "Carrière", to: "/career", icon: "🎮", description: "Missions, objectifs, storyline et récompenses.", difficulty: "Progressive", duration: "~30 jours" },
  { label: "Mode Professionnel", to: "/pro", icon: "📈", description: "Simulation professionnelle complète, crises et audits inclus.", difficulty: "Avancé", duration: "24 mois" },
  { label: "Sandbox", to: "/sandbox", icon: "🏗", description: "Jouez librement, sans objectifs ni sauvegarde.", difficulty: "Libre", duration: "Libre" },
  { label: "Scénarios", to: "/scenarios", icon: "🧪", description: "Un défi ciblé, avec ses propres objectifs et contraintes.", difficulty: "Variable", duration: "Court" },
  { label: "Challenges", to: "/challenges", icon: "⚡", description: "Affrontez d'autres joueurs sur le même scénario.", difficulty: "Compétitif", duration: "Court" },
  { label: "Academy", to: "/academy", icon: "🎓", description: "Cours et exercices guidés pour apprendre le métier.", difficulty: "Pédagogique", duration: "Variable" },
];

// Route: /select-mode -- reached after PlayMenu.jsx's login/signup/guest
// flow. Each card links to a real, already-wired mode: see each
// destination page's own docstring for how it's implemented. Redesigned
// as mode cards (icon, short description, difficulty, duration, explicit
// "Lancer" call to action) per the game UI spec.
export default function SelectMode() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0b1730] px-6 py-10 text-white">
      <div className={`text-center ${fadeIn}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">Hospitality Lab</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Choisissez votre mode de jeu</h1>
      </div>

      <nav aria-label="Modes de jeu" className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode, index) => (
          <Link key={mode.to} to={mode.to} style={delay(index)} className={`block ${slideUp}`}>
            <GameCard icon={mode.icon} title={mode.label} className="h-full bg-slate-900/60 !border-slate-800 text-left hover:!border-cyan-700">
              <p className="mb-3 text-sm text-slate-400">{mode.description}</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <GameBadge tone="neutral">🎯 {mode.difficulty}</GameBadge>
                <GameBadge tone="neutral">⏱️ {mode.duration}</GameBadge>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#e9ab1f]">Lancer →</span>
            </GameCard>
          </Link>
        ))}
      </nav>
    </div>
  );
}
