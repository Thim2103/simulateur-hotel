import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantOverview() {
  const { structure, kpis } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Structure de l’établissement">
          <div className="space-y-3 text-sm text-gray-700">
            <p><span className="font-semibold">Concept :</span> {structure.concept}</p>
            <p><span className="font-semibold">Localisation :</span> {structure.location}</p>
            <p><span className="font-semibold">Capacité :</span> {structure.capacity} couverts</p>
            <p><span className="font-semibold">Matériaux :</span> {structure.materials.join(", ")}</p>
          </div>
        </Card>

        <Card title="Équipement">
          <div className="flex flex-wrap gap-2">
            {structure.equipment.map((item) => (
              <Badge key={item} type="info">{item}</Badge>
            ))}
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
