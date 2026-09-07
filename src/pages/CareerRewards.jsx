import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useCareerContext } from "../context/CareerContext";

export default function CareerRewards() {
  const { careerState, isRunning, error, claimReward } = useCareerContext();

  if (!careerState) {
    return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Démarrez d'abord votre carrière depuis le tableau de bord.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Carrière</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Récompenses</h1>
          <p className="mt-1 text-sm text-slate-500">Gagnées via les missions et la storyline, à réclamer manuellement.</p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {careerState.rewardsInbox.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Aucune récompense en attente pour le moment.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {careerState.rewardsInbox.map((reward) => (
            <Card key={reward.id} title={reward.label}>
              <Badge type={reward.type === "cash" ? "success" : "info"}>{reward.type === "cash" ? "Bonus" : "Avantage"}</Badge>
              {reward.sourceLabel && <p className="mt-2 text-sm text-slate-500">Obtenue via : {reward.sourceLabel}</p>}
              <Button className="mt-3" onClick={() => claimReward(reward.id).catch(() => undefined)} disabled={isRunning}>Réclamer</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
