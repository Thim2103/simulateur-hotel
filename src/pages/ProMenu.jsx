import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useProEngine } from "../hooks/useProEngine";
import { HOTEL_SIZE_OPTIONS, SEGMENT_OPTIONS, POSITIONING_TIERS, PRO_STRATEGY_OPTIONS } from "../lib/pro/proScenario";

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

// Route: /pro -- "choix du type d'hôtel / positionnement / stratégie
// professionnelle" : a dedicated creation form for the Mode
// Professionnel Solo's own self-contained 24-month run (see
// lib/pro/proState.js's own header for why it never touches the regular
// Solo/Carrière save) -- same pattern as pages/TfeMenu.jsx.
export default function ProMenu() {
  const navigate = useNavigate();
  const { isRunning, error, startPro } = useProEngine();
  const [roomCount, setRoomCount] = useState(30);
  const [positioningTier, setPositioningTier] = useState("midscale");
  const [strategy, setStrategy] = useState("optimisation");
  const [segments, setSegments] = useState(["leisure"]);

  const toggleSegment = (segment) => {
    setSegments((current) => (current.includes(segment) ? current.filter((item) => item !== segment) : [...current, segment]));
  };

  const handleStart = async () => {
    try {
      await startPro({ roomCount, positioningTier, strategy, segments });
      navigate("/pro/dashboard");
    } catch {
      // error surfaced via `error`.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Professionnel Solo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Créer votre programme professionnel</h1>
          <p className="mt-1 text-sm text-slate-500">
            Type d'hôtel, positionnement et stratégie professionnelle -- votre simulation durera 24 mois (2 ans), avec scénarios, crises et opportunités.
          </p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <section aria-labelledby="pro-size" className="flex flex-col gap-3">
        <h2 id="pro-size" className="text-base font-semibold text-slate-900">Taille de l'établissement</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {HOTEL_SIZE_OPTIONS.map((option) => (
            <OptionCard key={option.id} selected={roomCount === option.roomCount} onClick={() => setRoomCount(option.roomCount)} title={option.label} />
          ))}
        </div>
      </section>

      <section aria-labelledby="pro-positioning" className="flex flex-col gap-3">
        <h2 id="pro-positioning" className="text-base font-semibold text-slate-900">Positionnement</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {POSITIONING_TIERS.map((tier) => (
            <OptionCard key={tier} selected={positioningTier === tier} onClick={() => setPositioningTier(tier)} title={TIER_LABEL[tier] || tier} />
          ))}
        </div>
      </section>

      <section aria-labelledby="pro-segments" className="flex flex-col gap-3">
        <h2 id="pro-segments" className="text-base font-semibold text-slate-900">Segments cibles</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SEGMENT_OPTIONS.map((segment) => (
            <OptionCard key={segment} selected={segments.includes(segment)} onClick={() => toggleSegment(segment)} title={SEGMENT_LABEL[segment] || segment} />
          ))}
        </div>
      </section>

      <section aria-labelledby="pro-strategy" className="flex flex-col gap-3">
        <h2 id="pro-strategy" className="text-base font-semibold text-slate-900">Stratégie professionnelle</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PRO_STRATEGY_OPTIONS.map((option) => (
            <OptionCard key={option.id} selected={strategy === option.id} onClick={() => setStrategy(option.id)} title={option.label} description={option.description} />
          ))}
        </div>
      </section>

      <Card>
        <Button onClick={handleStart} disabled={isRunning}>
          {isRunning ? "Création…" : "Commencer le mode professionnel"}
        </Button>
      </Card>
    </div>
  );
}
