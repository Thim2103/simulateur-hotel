import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantOverview() {
  const { structure, kpis, updateStructure } = useRestaurantSimulator();

  const handleArrayChange = (key, value) => {
    updateStructure({
      [key]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Structure de l’établissement">
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex flex-col gap-1">
              <label className="font-medium">Concept</label>
              <input
                className="border rounded-md px-3 py-2"
                value={structure.concept}
                onChange={(event) => updateStructure({ concept: event.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium">Localisation</label>
              <input
                className="border rounded-md px-3 py-2"
                value={structure.location}
                onChange={(event) => updateStructure({ location: event.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium">Capacité</label>
              <input
                type="number"
                className="border rounded-md px-3 py-2"
                value={structure.capacity}
                onChange={(event) =>
                  updateStructure({
                    capacity: Number(event.target.value || 0),
                    seats: Number(event.target.value || 0),
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium">Matériaux</label>
              <textarea
                className="border rounded-md px-3 py-2 min-h-[90px]"
                value={structure.materials.join(", ")}
                onChange={(event) => handleArrayChange("materials", event.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card title="Équipement">
          <div className="flex flex-col gap-4">
            <textarea
              className="border rounded-md px-3 py-2 min-h-[150px]"
              value={structure.equipment.join(", ")}
              onChange={(event) => handleArrayChange("equipment", event.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {structure.equipment.map((item) => (
                <Badge key={item} type="info">{item}</Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Occupation cible">
          <div className="text-2xl font-bold">{kpis.utilization}%</div>
        </Card>
        <Card title="Capacité totale">
          <div className="text-2xl font-bold">{structure.seats} places</div>
        </Card>
        <Card title="Performance globale">
          <div className="text-2xl font-bold">{kpis.score}/100</div>
        </Card>
      </div>
    </div>
  );
}
