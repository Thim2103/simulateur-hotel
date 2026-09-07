import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

const tasks = [
  {
    id: 1,
    room: "101",
    type: "Nettoyage complet",
    assigned: "Sophie",
    status: "à faire",
  },
  {
    id: 2,
    room: "204",
    type: "Changement draps",
    assigned: "Marc",
    status: "en cours",
  },
  {
    id: 3,
    room: "301",
    type: "Inspection",
    assigned: "Julie",
    status: "terminée",
  },
];

export default function Housekeeping() {
  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Entretien des chambres</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Housekeeping</h1>
          <p className="mt-1 text-sm text-slate-500">Suivez les tâches de nettoyage et leur avancement.</p>
        </div>
        <Button>Nouvelle tâche</Button>
      </header>

      {/* Table */}
      <Table columns={["Chambre", "Tâche", "Assignée à", "Statut"]}>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <td className="px-4 py-2">{task.room}</td>
            <td className="px-4 py-2">{task.type}</td>
            <td className="px-4 py-2">{task.assigned}</td>
            <td className="px-4 py-2">
              <Badge
                type={
                  task.status === "terminée"
                    ? "success"
                    : task.status === "en cours"
                    ? "warning"
                    : "danger"
                }
              >
                {task.status}
              </Badge>
            </td>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
