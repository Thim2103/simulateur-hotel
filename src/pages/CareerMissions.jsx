import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useCareerContext } from "../context/CareerContext";

const STATUS_BADGE = { available: "info", accepted: "warning", completed: "success" };

export default function CareerMissions() {
  const { careerState, isRunning, error, acceptMission, completeMission } = useCareerContext();

  if (!careerState) {
    return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Démarrez d'abord votre carrière depuis le tableau de bord.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Carrière</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Missions</h1>
          <p className="mt-1 text-sm text-slate-500">Acceptez une mission pour la voir évaluée automatiquement à chaque journée.</p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {careerState.missions.map((mission) => (
          <Card key={mission.id} title={mission.title}>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">{mission.description}</p>
              <Badge type={STATUS_BADGE[mission.status]}>{mission.status}</Badge>
              {mission.status === "available" && (
                <Button onClick={() => acceptMission(mission.id).catch(() => undefined)} disabled={isRunning}>Accepter</Button>
              )}
              {mission.status === "accepted" && !mission.auto && (
                <Button onClick={() => completeMission(mission.id).catch(() => undefined)} disabled={isRunning}>Terminer</Button>
              )}
              {mission.status === "accepted" && mission.auto && (
                <p className="text-xs text-slate-500">Progression suivie automatiquement à chaque journée.</p>
              )}
              {mission.status === "completed" && <p className="text-xs text-emerald-700">Terminée au jour {mission.completedOnDay}.</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
