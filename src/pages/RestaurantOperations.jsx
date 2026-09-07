import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantOperations() {
  const { operations, updateOperation, addOperation, removeOperation } = useRestaurantSimulator();
  const selectClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nettoyage</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{operations.filter((task) => task.type === "cleaning").length} tâches</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Maintenance</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{operations.filter((task) => task.type === "maintenance").length} planifiées</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Réclamations</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{operations.filter((task) => task.type === "complaint").length} ouverte(s)</div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Suivi opérationnel</h3>
          <Button onClick={addOperation}>Ajouter</Button>
        </div>

        <div className="space-y-4">
          {operations.map((task) => (
            <div key={task.id} className="rounded-lg border border-slate-200 p-4 transition-colors duration-150 hover:border-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mb-3">
                <Input
                  value={task.title}
                  onChange={(event) => updateOperation(task.id, { title: event.target.value })}
                  placeholder="Titre"
                />
                <select
                  className={selectClass}
                  value={task.type}
                  onChange={(event) => updateOperation(task.id, { type: event.target.value })}
                >
                  <option value="cleaning">Nettoyage</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="complaint">Réclamation</option>
                </select>
                <select
                  className={selectClass}
                  value={task.status}
                  onChange={(event) => updateOperation(task.id, { status: event.target.value })}
                >
                  <option value="à faire">À faire</option>
                  <option value="planifiée">Planifiée</option>
                  <option value="ouverte">Ouverte</option>
                  <option value="terminée">Terminée</option>
                </select>
                <Input
                  value={task.owner}
                  onChange={(event) => updateOperation(task.id, { owner: event.target.value })}
                  placeholder="Responsable"
                />
                <select
                  className={selectClass}
                  value={task.priority}
                  onChange={(event) => updateOperation(task.id, { priority: event.target.value })}
                >
                  <option value="basse">Basse</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                </select>
                <Button type="button" variant="danger" onClick={() => removeOperation(task.id)}>
                  Supprimer
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  type={
                    task.status === "terminée"
                      ? "success"
                      : task.status === "planifiée"
                      ? "warning"
                      : task.status === "ouverte"
                      ? "danger"
                      : "info"
                  }
                >
                  {task.status}
                </Badge>
                <Badge type="info">{task.priority}</Badge>
                <Input
                  value={task.dueIn}
                  onChange={(event) => updateOperation(task.id, { dueIn: event.target.value })}
                  placeholder="Délai"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
