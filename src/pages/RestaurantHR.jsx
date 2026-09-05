import Button from "../components/ui/Button";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantHR() {
  const { staff, kpis, updateStaff, addStaff, removeStaff } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="text-sm text-gray-500">Effectif</div>
          <div className="text-2xl font-bold">{kpis.staffCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="text-sm text-gray-500">Salaire moyen</div>
          <div className="text-2xl font-bold">{Math.round(kpis.averageSalary).toLocaleString()} €</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="text-sm text-gray-500">Charge RH</div>
          <div className="text-2xl font-bold">{kpis.payroll.toLocaleString()} €</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Équipe du restaurant</h3>
          <Button onClick={addStaff}>Ajouter</Button>
        </div>

        <div className="space-y-4">
          {staff.map((person) => (
            <div key={person.id} className="border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-3">
                <input
                  className="border rounded-md px-3 py-2"
                  value={person.name}
                  onChange={(event) => updateStaff(person.id, { name: event.target.value })}
                  placeholder="Nom"
                />
                <input
                  className="border rounded-md px-3 py-2"
                  value={person.role}
                  onChange={(event) => updateStaff(person.id, { role: event.target.value })}
                  placeholder="Poste"
                />
                <input
                  className="border rounded-md px-3 py-2"
                  value={person.department}
                  onChange={(event) => updateStaff(person.id, { department: event.target.value })}
                  placeholder="Département"
                />
                <input
                  type="number"
                  className="border rounded-md px-3 py-2"
                  value={person.salary}
                  onChange={(event) => updateStaff(person.id, { salary: Number(event.target.value || 0) })}
                  placeholder="Salaire"
                />
                <button
                  type="button"
                  className="bg-red-500 text-white rounded-md px-3 py-2"
                  onClick={() => removeStaff(person.id)}
                >
                  Supprimer
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Compétences</label>
                <input
                  className="border rounded-md px-3 py-2"
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
