import { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import { useRestaurant } from "../hooks/useRestaurant";

const textareaClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-shadow placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100 min-h-[90px]";

function toCsv(list) {
  return Array.isArray(list) ? list.join(", ") : "";
}

function fromCsv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

// The player's first real decision: describe the establishment, then
// validate it. Validating writes the restaurant profile to Supabase (see
// hooks/useRestaurant.js's submitStructure()) and sets
// progression.ready = true, which unlocks every other restaurant tab (see
// pages/RestaurantSimulator.jsx).
export default function RestaurantStructure() {
  const { restaurantState, loading, error, loadRestaurantState, submitStructure } = useRestaurant();
  const [form, setForm] = useState({ name: "", concept: "", location: "", capacity: "", materials: [], equipment: [] });
  const [fieldErrors, setFieldErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadRestaurantState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (restaurantState?.structure) {
      const structure = restaurantState.structure;
      setForm({
        name: structure.name || "",
        concept: structure.concept || "",
        location: structure.location || "",
        capacity: structure.capacity || "",
        materials: structure.materials || [],
        equipment: structure.equipment || [],
      });
    }
  }, [restaurantState]);

  const isReady = Boolean(restaurantState?.progression?.ready);

  const handleChange = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }));
  const handleArrayChange = (field) => (event) => setForm((previous) => ({ ...previous, [field]: fromCsv(event.target.value) }));

  const errorFor = (field) => fieldErrors.find((entry) => entry.field === field)?.message;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    try {
      const result = await submitStructure({ ...form, capacity: Number(form.capacity || 0), seats: Number(form.capacity || 0) });
      setFieldErrors(result.errors || []);
      if (result.valid) setSubmitted(true);
    } catch {
      // error is already surfaced via `error` from the hook.
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !restaurantState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des données restaurant…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Étape 1</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Structure de l'établissement</h1>
          <p className="mt-1 text-sm text-slate-500">Décrivez votre établissement pour débloquer le reste des modules restaurant.</p>
        </div>
        {isReady && <Badge type="success">Établissement validé</Badge>}
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Impossible de charger ou d'enregistrer les données restaurant : {error.message}
        </div>
      )}

      {submitted && !error && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Établissement validé. Les autres onglets sont maintenant accessibles.
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Concept">
          <div className="flex flex-col gap-4">
            <Input label="Nom de l'établissement" value={form.name} onChange={handleChange("name")} placeholder="Ex : Le Central" />
            {errorFor("name") && <p className="text-xs text-rose-600">{errorFor("name")}</p>}

            <Input label="Concept" value={form.concept} onChange={handleChange("concept")} placeholder="Ex : Bistro moderne & cuisine locale" />
            {errorFor("concept") && <p className="text-xs text-rose-600">{errorFor("concept")}</p>}

            <Input label="Localisation" value={form.location} onChange={handleChange("location")} placeholder="Ex : Lyon, France" />
            {errorFor("location") && <p className="text-xs text-rose-600">{errorFor("location")}</p>}

            <Input label="Capacité (places)" type="number" min="1" value={form.capacity} onChange={handleChange("capacity")} placeholder="Ex : 60" />
            {errorFor("capacity") && <p className="text-xs text-rose-600">{errorFor("capacity")}</p>}
          </div>
        </Card>

        <Card title="Équipements">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-700">Matériaux</span>
              <textarea className={textareaClass} value={toCsv(form.materials)} onChange={handleArrayChange("materials")} placeholder="Bois clair, Acier corten, ..." />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-700">Équipements</span>
              <textarea className={textareaClass} value={toCsv(form.equipment)} onChange={handleArrayChange("equipment")} placeholder="Four professionnel, Plancha, ..." />
            </label>

            <div className="flex flex-wrap gap-2">
              {form.equipment.map((item) => (
                <Badge key={item} type="info">{item}</Badge>
              ))}
            </div>
          </div>
        </Card>

        <div className="xl:col-span-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : isReady ? "Mettre à jour l'établissement" : "Valider l'établissement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
