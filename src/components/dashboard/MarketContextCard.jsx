import Card from "../ui/Card";

// Étape 5's market indicator: météo & saison, segment dominant du jour et
// pression concurrentielle -- three plain-language readings of
// lib/data/marketContextEngine.js's own buildMarketContext(), shown
// wherever the player is about to make a decision (Espace Décisions).
// Purely informational today (see marketContextEngine.js's own docstring
// on why it doesn't yet feed the live demand model).
export default function MarketContextCard({ context }) {
  if (!context) return null;
  const { season, destination, dominantSegment, competitivePressure, localEvent } = context;
  const affluence = season.tier === "high" ? "forte affluence" : season.tier === "low" ? "faible affluence" : "affluence stable";

  return (
    <Card>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">📍 Contexte marché — {destination.name}</h3>
      <div className="flex flex-col gap-1.5 text-sm text-slate-700">
        <p data-testid="market-season">{season.icon} {season.label} · {affluence}</p>
        <p data-testid="market-segment">
          {dominantSegment.icon} Majorité de {dominantSegment.label}{dominantSegment.priceSensitivity >= 0.7 ? " / sensibles au prix" : ""}
        </p>
        {competitivePressure && (
          <p data-testid="market-competition">
            📊 Concurrents alignés à {competitivePressure.averagePrice} €/nuit
            {competitivePressure.delta !== null && ` (vous : ${competitivePressure.delta >= 0 ? "+" : ""}${competitivePressure.delta} %)`}
          </p>
        )}
        {localEvent && (
          <p data-testid="market-event">
            {localEvent.icon} {localEvent.label} — profite au segment {localEvent.boostedSegment.label}
          </p>
        )}
      </div>
    </Card>
  );
}
