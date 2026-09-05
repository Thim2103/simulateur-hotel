import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantHR() {
  const { staff, kpis } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-500">Effectif</div>
          <div className="text-2xl font-bold">{kpis.staffCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-500">Salaire moyen</div>
          <div className="text-2xl font-bold">{Math.round(kpis.averageSalary).toLocaleString()} €</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-500">Charge RH</div>
          <div className="text-2xl font-bold">{kpis.payroll.toLocaleString()} €</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">Équipe du restaurant</h3>
        <Table columns={["Nom", "Poste", "Département", "Salaire", "Compétences"]}>
          {staff.map((person) => (
            <TableRow key={person.id}>
              <td className="px-4 py-2">{person.name}</td>
              <td className="px-4 py-2">{person.role}</td>
              <td className="px-4 py-2">{person.department}</td>
              <td className="px-4 py-2">{person.salary.toLocaleString()} €</td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-2">
                  {person.skills.map((skill) => (
                    <Badge key={skill} type="info">{skill}</Badge>
                  ))}
                </div>
              </td>
            </TableRow>
          ))}
        </Table>
      </div>
    </div>
  );
}
