import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantMenu() {
  const { menu, updateMenu, addMenuItem, removeMenuItem } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Menu & produits</h3>
          <Button onClick={addMenuItem}>Ajouter</Button>
        </div>

        <div className="space-y-4">
          {menu.map((item) => {
            const margin = Number(item.price || 0) - Number(item.cost || 0);
            const marginPercent = item.price ? ((margin / item.price) * 100).toFixed(0) : 0;

            return (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mb-3">
                  <input
                    className="border rounded-md px-3 py-2"
                    value={item.name}
                    onChange={(event) => updateMenu(item.id, { name: event.target.value })}
                    placeholder="Nom"
                  />
                  <input
                    className="border rounded-md px-3 py-2"
                    value={item.category}
                    onChange={(event) => updateMenu(item.id, { category: event.target.value })}
                    placeholder="Catégorie"
                  />
                  <input
                    type="number"
                    className="border rounded-md px-3 py-2"
                    value={item.cost}
                    onChange={(event) => updateMenu(item.id, { cost: Number(event.target.value || 0) })}
                    placeholder="Coût"
                  />
                  <input
                    type="number"
                    className="border rounded-md px-3 py-2"
                    value={item.price}
                    onChange={(event) => updateMenu(item.id, { price: Number(event.target.value || 0) })}
                    placeholder="Prix"
                  />
                  <input
                    type="number"
                    className="border rounded-md px-3 py-2"
                    value={item.sales}
                    onChange={(event) => updateMenu(item.id, { sales: Number(event.target.value || 0) })}
                    placeholder="Ventes"
                  />
                  <button
                    type="button"
                    className="bg-red-500 text-white rounded-md px-3 py-2"
                    onClick={() => removeMenuItem(item.id)}
                  >
                    Supprimer
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  Marge: {margin.toFixed(2)} € ({marginPercent}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-lg font-semibold mb-4">Tableau résumé</h3>
        <Table columns={["Produit", "Catégorie", "Coût", "Prix", "Marge", "Ventes/jour"]}>
          {menu.map((item) => {
            const margin = Number(item.price || 0) - Number(item.cost || 0);
            const marginPercent = item.price ? ((margin / item.price) * 100).toFixed(0) : 0;

            return (
              <TableRow key={item.id}>
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2">
                  <Badge type="success">{item.category}</Badge>
                </td>
                <td className="px-4 py-2">{Number(item.cost || 0).toFixed(2)} €</td>
                <td className="px-4 py-2">{Number(item.price || 0).toFixed(2)} €</td>
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
