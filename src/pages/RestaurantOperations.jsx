import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantOperations() {
  const { operations, updateOperation, addOperation, removeOperation } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="text-sm text-gray-500">Nettoyage</div>
          <div className="text-2xl font-bold">{operations.filter((task) => task.type === "cleaning").length} tâches</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="text-sm text-gray-500">Maintenance</div>
          <div className="text-2xl font-bold">{operations.filter((task) => task.type === "maintenance").length} planifiées</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="text-sm text-gray-500">Réclamations</div>
          <div className="text-2xl font-bold">{operations.filter((task) => task.type === "complaint").length} ouverte(s)</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Suivi opérationnel</h3>
          <Button onClick={addOperation}>Ajouter</Button>
        </div>

        <div className="space-y-4">
          {operations.map((task) => (
            <div key={task.id} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mb-3">
                <input
                  className="border rounded-md px-3 py-2"
                  value={task.title}
                  onChange={(event) => updateOperation(task.id, { title: event.target.value })}
                  placeholder="Titre"
                />
                <select
                  className="border rounded-md px-3 py-2"
                  value={task.type}
                  onChange={(event) => updateOperation(task.id, { type: event.target.value })}
                >
                  <option value="cleaning">Nettoyage</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="complaint">Réclamation</option>
                </select>
                <select
                  className="border rounded-md px-3 py-2"
                  value={task.status}
                  onChange={(event) => updateOperation(task.id, { status: event.target.value })}
                >
                  <option value="à faire">À faire</option>
                  <option value="planifiée">Planifiée</option>
                  <option value="ouverte">Ouverte</option>
                  <option value="terminée">Terminée</option>
                </select>
                <input
                  className="border rounded-md px-3 py-2"
                  value={task.owner}
                  onChange={(event) => updateOperation(task.id, { owner: event.target.value })}
                  placeholder="Responsable"
                />
                <select
                  className="border rounded-md px-3 py-2"
                  value={task.priority}
                  onChange={(event) => updateOperation(task.id, { priority: event.target.value })}
                >
                  <option value="basse">Basse</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                </select>
                <button
                  type="button"
                  className="bg-red-500 text-white rounded-md px-3 py-2"
                  onClick={() => removeOperation(task.id)}
                >
                  Supprimer
                </button>
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
                <input
                  className="border rounded-md px-3 py-2"
                  value={task.dueIn}
                  onChange={(event) => updateOperation(task.id, { dueIn: event.target.value })}
                  placeholder="Délai"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
