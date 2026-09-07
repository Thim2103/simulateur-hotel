import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantMenu() {
  const { menu, updateMenu, addMenuItem, removeMenuItem } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Menu &amp; produits</h3>
          <Button onClick={addMenuItem}>Ajouter</Button>
        </div>

        <div className="space-y-4">
          {menu.map((item) => {
            const margin = Number(item.price || 0) - Number(item.cost || 0);
            const marginPercent = item.price ? ((margin / item.price) * 100).toFixed(0) : 0;

            return (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4 transition-colors duration-150 hover:border-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mb-3">
                  <Input
                    value={item.name}
                    onChange={(event) => updateMenu(item.id, { name: event.target.value })}
                    placeholder="Nom"
                  />
                  <Input
                    value={item.category}
                    onChange={(event) => updateMenu(item.id, { category: event.target.value })}
                    placeholder="Catégorie"
                  />
                  <Input
                    type="number"
                    value={item.cost}
                    onChange={(event) => updateMenu(item.id, { cost: Number(event.target.value || 0) })}
                    placeholder="Coût"
                  />
                  <Input
                    type="number"
                    value={item.price}
                    onChange={(event) => updateMenu(item.id, { price: Number(event.target.value || 0) })}
                    placeholder="Prix"
                  />
                  <Input
                    type="number"
                    value={item.sales}
                    onChange={(event) => updateMenu(item.id, { sales: Number(event.target.value || 0) })}
                    placeholder="Ventes"
                  />
                  <Button type="button" variant="danger" onClick={() => removeMenuItem(item.id)}>
                    Supprimer
                  </Button>
                </div>

                <div className="text-sm text-slate-500">
                  Marge: {margin.toFixed(2)} € ({marginPercent}%)
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Tableau résumé">
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
      </Card>
    </div>
  );
}
