import GameButton from "../../ui/components/GameButton";
import { slideUp } from "../../ui/animations";

// The hotel-as-a-character header: "Mon Hôtel", today's cycle, and the
// one action that actually advances the story -- "Jouer la journée"
// (careerEngine.nextDay(), wired in through useCareer.js). Restyled with
// the game design system (GameButton's gold "primary action" variant,
// see ui/components/GameButton.jsx) -- text/roles unchanged so every
// existing caller keeps working.
export default function DashboardHeader({ day, date, isGuest, onNextDay, isRunning }) {
  return (
    <header className={`page-header ${slideUp}`}>
      <div>
        <p className="eyebrow">{isGuest ? "Mode invité" : "Vue d'ensemble"}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mon Hôtel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Jour {day}
          {date ? ` · ${date}` : ""}
        </p>
      </div>
      <GameButton variant="gold" icon="☀️" onClick={onNextDay} disabled={isRunning}>
        {isRunning ? "Calcul en cours…" : "Jouer la journée"}
      </GameButton>
    </header>
  );
}
