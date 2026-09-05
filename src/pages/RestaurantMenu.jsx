import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantMenu() {
  const { menu } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">Menu & produits</h3>
        <Table columns={["Produit", "Catégorie", "Coût", "Prix", "Marge", "Ventes/jour"]}>
          {menu.map((item) => {
            const margin = item.price - item.cost;
            const marginPercent = ((margin / item.price) * 100).toFixed(0);

            return (
              <TableRow key={item.id}>
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2">
                  <Badge type="success">{item.category}</Badge>
                </td>
                <td className="px-4 py-2">{item.cost.toFixed(2)} €</td>
                <td className="px-4 py-2">{item.price.toFixed(2)} €</td>
                <td className="px-4 py-2">{margin.toFixed(2)} € ({marginPercent}%)</td>
                <td className="px-4 py-2">{item.sales}</td>
              </TableRow>
            );
          })}
        </Table>
      </div>
    </div>
  );
}
