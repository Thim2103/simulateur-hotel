import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

// Route: /solo -- "Mode Solo" is the same mode as "Carrière" (see the
// Solo/Career module, lib/career/): the two names describe one already-
// built game loop, not two separate ones. Rather than duplicate that
// engine behind a second route, this page explains that and hands off to
// the real thing at /career.
export default function Solo() {
  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Solo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Jouez à votre rythme</h1>
          <p className="mt-1 text-sm text-slate-500">
            Le Mode Solo, c'est le Mode Carrière : votre propre hôtel, vos missions, votre progression.
          </p>
        </div>
      </header>
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Missions, objectifs, storyline, compétences et récompenses vous attendent dans le Mode Carrière.
        </p>
        <Link to="/career">
          <Button>Continuer vers le Mode Carrière</Button>
        </Link>
      </Card>
    </div>
  );
}
