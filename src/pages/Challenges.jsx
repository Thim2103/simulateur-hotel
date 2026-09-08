import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

// Route: /challenges -- "Challenges" (facing off against other players on
// the same scenario) is already fully built as the Competition module
// (lib/competition/, pages/CompetitionDashboard.jsx and friends), just
// not in the top-bar's primary menu. Same treatment as Solo.jsx: explain
// and hand off, instead of building a second competitive mode.
export default function Challenges() {
  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Challenges</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Affrontez d'autres joueurs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Les Challenges, c'est le mode Compétition : même scénario, plusieurs joueurs, un classement.
          </p>
        </div>
      </header>
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Créez un match, invitez des joueurs et comparez vos résultats une fois le scénario terminé.
        </p>
        <Link to="/competition">
          <Button>Continuer vers la Compétition</Button>
        </Link>
      </Card>
    </div>
  );
}
