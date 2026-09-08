import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useTfeEngine } from "../hooks/useTfeEngine";
import { HOTEL_SIZE_OPTIONS, SEGMENT_OPTIONS, STRATEGY_OPTIONS, POSITIONING_TIERS } from "../lib/tfe/tfeScenario";

const TIER_LABEL = { budget: "Budget", midscale: "Milieu de gamme", upscale: "Haut de gamme", luxury: "Luxe" };
const SEGMENT_LABEL = { business: "Business", leisure: "Leisure", famille: "Famille", premium: "Premium" };

function OptionCard({ selected, onClick, title, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-all duration-150 hover:-translate-y-0.5 ${
        selected ? "border-cyan-600 bg-cyan-50 ring-2 ring-cyan-200" : "border-slate-200 bg-white hover:border-cyan-300"
      }`}
    >
      <span className="text-sm font-semibold text-slate-900">{title}</span>
      {description && <span className="text-xs text-slate-500">{description}</span>}
    </button>
  );
}

// Route: /tfe -- "création d'un hôtel (positionnement, taille, segments,
// stratégie)" (section 4). A dedicated creation form for the TFE Solo
// mode's own self-contained 36-month run (see lib/tfe/tfeState.js's own
// header for why it never touches the regular Solo/Carrière save) --
// distinct from pages/CareerDashboard.jsx's "Démarrer ma carrière", which
// always starts from the player's real, persisted hotel.
export default function TfeMenu() {
  const navigate = useNavigate();
  const { isRunning, error, startTfe } = useTfeEngine();
  const [roomCount, setRoomCount] = useState(30);
  const [positioningTier, setPositioningTier] = useState("midscale");
  const [strategy, setStrategy] = useState("rentabilite");
  const [segments, setSegments] = useState(["leisure"]);

  const toggleSegment = (segment) => {
    setSegments((current) => (current.includes(segment) ? current.filter((item) => item !== segment) : [...current, segment]));
  };

  const handleStart = async () => {
    try {
      await startTfe({ roomCount, positioningTier, strategy, segments });
      navigate("/tfe/dashboard");
    } catch {
      // error surfaced via `error`.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode TFE Solo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Créer votre établissement</h1>
          <p className="mt-1 text-sm text-slate-500">Positionnement, taille, segments et stratégie -- votre simulation durera 36 mois (3 ans).</p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <section aria-labelledby="tfe-size" className="flex flex-col gap-3">
        <h2 id="tfe-size" className="text-base font-semibold text-slate-900">Taille de l'établissement</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {HOTEL_SIZE_OPTIONS.map((option) => (
            <OptionCard key={option.id} selected={roomCount === option.roomCount} onClick={() => setRoomCount(option.roomCount)} title={option.label} />
          ))}
        </div>
      </section>

      <section aria-labelledby="tfe-positioning" className="flex flex-col gap-3">
        <h2 id="tfe-positioning" className="text-base font-semibold text-slate-900">Positionnement</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {POSITIONING_TIERS.map((tier) => (
            <OptionCard key={tier} selected={positioningTier === tier} onClick={() => setPositioningTier(tier)} title={TIER_LABEL[tier] || tier} />
          ))}
        </div>
      </section>

      <section aria-labelledby="tfe-segments" className="flex flex-col gap-3">
        <h2 id="tfe-segments" className="text-base font-semibold text-slate-900">Segments cibles</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SEGMENT_OPTIONS.map((segment) => (
            <OptionCard key={segment} selected={segments.includes(segment)} onClick={() => toggleSegment(segment)} title={SEGMENT_LABEL[segment] || segment} />
          ))}
        </div>
      </section>

      <section aria-labelledby="tfe-strategy" className="flex flex-col gap-3">
        <h2 id="tfe-strategy" className="text-base font-semibold text-slate-900">Stratégie</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STRATEGY_OPTIONS.map((option) => (
            <OptionCard key={option.id} selected={strategy === option.id} onClick={() => setStrategy(option.id)} title={option.label} description={option.description} />
          ))}
        </div>
      </section>

      <Card>
        <Button onClick={handleStart} disabled={isRunning}>
          {isRunning ? "Création…" : "Commencer le TFE"}
        </Button>
      </Card>
    </div>
  );
}
