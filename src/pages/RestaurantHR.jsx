import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantHR() {
  const { staff, kpis, updateStaff, addStaff, removeStaff } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Effectif</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{kpis.staffCount}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Salaire moyen</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{Math.round(kpis.averageSalary).toLocaleString()} €</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Charge RH</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{kpis.payroll.toLocaleString()} €</div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Équipe du restaurant</h3>
          <Button onClick={addStaff}>Ajouter</Button>
        </div>

        <div className="space-y-4">
          {staff.map((person) => (
            <div key={person.id} className="rounded-lg border border-slate-200 p-4 transition-colors duration-150 hover:border-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-3">
                <Input
                  value={person.name}
                  onChange={(event) => updateStaff(person.id, { name: event.target.value })}
                  placeholder="Nom"
                />
                <Input
                  value={person.role}
                  onChange={(event) => updateStaff(person.id, { role: event.target.value })}
                  placeholder="Poste"
                />
                <Input
                  value={person.department}
                  onChange={(event) => updateStaff(person.id, { department: event.target.value })}
                  placeholder="Département"
                />
                <Input
                  type="number"
                  value={person.salary}
                  onChange={(event) => updateStaff(person.id, { salary: Number(event.target.value || 0) })}
                  placeholder="Salaire"
                />
                <Button type="button" variant="danger" onClick={() => removeStaff(person.id)}>
                  Supprimer
                </Button>
              </div>
              <Input
                label="Compétences"
                value={person.skills.join(", ")}
                onChange={(event) =>
                  updateStaff(person.id, {
                    skills: event.target.value
                      .split(",")
                      .map((skill) => skill.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
