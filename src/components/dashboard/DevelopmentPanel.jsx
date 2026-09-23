import Card from "../ui/Card";
import { AXES, tiersForAxis, tierStatus } from "../../lib/progression/positioningEngine";
import { hotelIdentity } from "../../lib/progression/hotelIdentityEngine";
import { segmentById } from "../../lib/data/segments/segments";

const STATUS_LABEL = { installed: "Installé", "no-funds": "Trésorerie insuffisante", available: "Investir" };

// Étape 6's "Espace Développement": the hotel's own dynamic identity
// (lib/progression/hotelIdentityEngine.js, built purely from which
// positioning axes the player invested in) at the top, then every axis's
// own investable tiers (lib/progression/positioningEngine.js) -- cost,
// real reputation gain and the guest segments it charms, each named
// explicitly so a decision is never a guess.
export default function DevelopmentPanel({ hotelState, onInvest, onOpenExpansion }) {
  const identity = hotelIdentity(hotelState);

  return (
    <Card>
      <div className="mb-4 border-b border-slate-100 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Concept actuel</p>
        <h2 data-testid="development-identity-title" className="text-lg font-bold text-slate-900">{identity.title}</h2>
        {identity.strengths.length > 0 && <p className="mt-1 text-sm text-emerald-700">Points forts : {identity.strengths.join(", ")}</p>}
        {identity.targetSegments.length > 0 && (
          <p className="mt-1 text-sm text-slate-600">Clientèle cible : {identity.targetSegments.map((segment) => segment.label).join(", ")}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.values(AXES).map((axis) => (
          <div key={axis.id} data-testid={`development-axis-${axis.id}`} className="rounded-xl border border-slate-200 p-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">{axis.icon} {axis.label}</h3>
            <div className="flex flex-col gap-2">
              {tiersForAxis(axis.id).map((tier) => {
                const status = tierStatus(hotelState, tier.id);
                return (
                  <div key={tier.id} className="rounded-lg border border-slate-100 p-2 text-sm">
                    <p className="font-medium text-slate-900">{tier.name}</p>
                    <p className="text-xs text-slate-500">{tier.description}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {tier.cost.toLocaleString("fr-FR")} € · +{tier.reputationBonus} réputation · Charme : {tier.attractsSegments.map((id) => segmentById(id).label).join(", ")}
                    </p>
                    <button
                      type="button"
                      disabled={status !== "available"}
                      onClick={() => onInvest(tier.id)}
                      className="mt-2 rounded-lg bg-cyan-700 px-2 py-1 text-xs font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-cyan-700"
                    >
                      {STATUS_LABEL[status] || "Investir"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {onOpenExpansion && (
        <button type="button" onClick={onOpenExpansion} className="mt-4 text-sm font-medium text-cyan-700 hover:underline">
          🏗️ Grands chantiers (extensions physiques) →
        </button>
      )}
    </Card>
  );
}
