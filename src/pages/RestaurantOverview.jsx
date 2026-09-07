import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";
import { defaultStructure } from "../lib/restaurantRepository";

const safe = (arr) => (Array.isArray(arr) ? arr : []);
const textareaClass = "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-shadow placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100";

export default function RestaurantOverview() {
  const { structure: loadedStructure, kpis, updateStructure } = useRestaurantSimulator();
  const structure = { ...defaultStructure, ...(loadedStructure || {}) };
  const sections = safe(structure?.sections);
  const materials = safe(structure?.materials);
  const equipment = safe(structure?.equipment);
  const sectionList = sections.join(", ");

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
          <div className="space-y-4 text-sm text-slate-700">
            <Input
              label="Concept"
              value={structure.concept}
              onChange={(event) => updateStructure({ concept: event.target.value })}
            />

            <Input
              label="Localisation"
              value={structure.location}
              onChange={(event) => updateStructure({ location: event.target.value })}
            />

            <Input
              label="Capacité"
              type="number"
              value={structure.capacity}
              onChange={(event) =>
                updateStructure({
                  capacity: Number(event.target.value || 0),
                  seats: Number(event.target.value || 0),
                })
              }
            />

            <Input
              label="Sections"
              value={sectionList}
              onChange={(event) => handleArrayChange("sections", event.target.value)}
            />

            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-700">Matériaux</span>
              <textarea
                className={`${textareaClass} min-h-[90px]`}
                value={materials.join(", ")}
                onChange={(event) => handleArrayChange("materials", event.target.value)}
              />
            </label>
          </div>
        </Card>

        <Card title="Équipement">
          <div className="flex flex-col gap-4">
            <textarea
              className={`${textareaClass} min-h-[150px]`}
              value={equipment.join(", ")}
              onChange={(event) => handleArrayChange("equipment", event.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {equipment.map((item) => (
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
