import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useChainContext } from "../context/ChainContext";

// Rough, illustrative placement for a handful of well-known cities; any
// other city name gets a deterministic (but arbitrary) spot instead of
// crashing -- this is a lightweight decorative map, not a geographic one.
const CITY_POSITIONS = {
  paris: [49, 32], lyon: [51, 40], nice: [54, 43], marseille: [51, 44], bordeaux: [45, 42],
  london: [47, 28], madrid: [45, 46], rome: [53, 47], berlin: [52, 27], amsterdam: [49, 28],
  "new york": [27, 34], "new-york": [27, 34], "los angeles": [12, 38], tokyo: [86, 36], dubai: [63, 48],
};

function hashPosition(city) {
  let hash = 0;
  for (let index = 0; index < city.length; index += 1) hash = (hash * 31 + city.charCodeAt(index)) % 1000;
  return [10 + (hash % 80), 15 + ((hash * 7) % 60)];
}

function cityPosition(city) {
  const key = String(city || "").trim().toLowerCase();
  return CITY_POSITIONS[key] || hashPosition(key || "unknown");
}

function WorldMap({ hotels, activeHotelId, onSelect }) {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-b from-cyan-50 to-white">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", backgroundSize: "10% 20%" }} />
      {hotels.map((hotel) => {
        const [x, y] = cityPosition(hotel.city);
        const isActive = hotel.id === activeHotelId;
        return (
          <button
            key={hotel.id}
            type="button"
            onClick={() => onSelect(hotel.id)}
            title={`${hotel.name} — ${hotel.city}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform duration-150 hover:scale-125 ${
              isActive ? "h-4 w-4 border-cyan-700 bg-cyan-500" : "h-3 w-3 border-slate-400 bg-white"
            }`}
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        );
      })}
      {hotels.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Aucun hôtel dans la chaîne pour le moment.</p>
      )}
    </div>
  );
}

const EVENT_ID_KEY = (event, index) => event.id || `${event.name || "event"}-${index}`;

// Multi-hotel chain overview: the list of hotels, consolidated finance/RM,
// regional & global events, and the chain's own progression track -- all
// produced by lib/multiHotel/chainEngine.js. See useChain.js's docstring on
// today's one-Supabase-hotel-per-user limit: only the first hotel added
// here can be persisted, the rest are session-local until a future
// migration relaxes that constraint for real multi-hotel accounts.
export default function ChainDashboard() {
  const { chainState, activeHotel, chainReport, addHotel, switchHotel, runChainCycle, isRunning, error } = useChainContext();
  const [newHotelName, setNewHotelName] = useState("");
  const [newHotelCity, setNewHotelCity] = useState("");

  const handleAddHotel = () => {
    if (!newHotelName.trim()) return;
    addHotel({ name: newHotelName.trim(), city: newHotelCity.trim() || "Ville à définir", roomCount: 60 });
    setNewHotelName("");
    setNewHotelCity("");
  };

  const financeByHotel = new Map((chainReport?.finance ? chainReport.hotels : []).map((hotel) => [hotel.id, hotel.dailyReport]));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Chaîne hôtelière</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Pilotage multi-hôtels</h1>
          <p className="mt-1 text-sm text-slate-500">Vue consolidée de tous vos établissements : finances, RM, événements régionaux et progression de la chaîne.</p>
        </div>
        <Button onClick={() => runChainCycle().catch(() => undefined)} disabled={isRunning || chainState.hotels.length === 0}>
          {isRunning ? "Calcul en cours…" : "Jour suivant (chaîne)"}
        </Button>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Impossible de calculer le cycle de la chaîne : {error.message}
        </div>
      )}

      <Card title="Hôtels de la chaîne">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Nom de l'hôtel" value={newHotelName} onChange={(event) => setNewHotelName(event.target.value)} placeholder="Ex : Riviera Palace" />
            <Input label="Ville" value={newHotelCity} onChange={(event) => setNewHotelCity(event.target.value)} placeholder="Ex : Nice" />
            <Button onClick={handleAddHotel} disabled={!newHotelName.trim()}>Ajouter un hôtel</Button>
          </div>

          {chainState.hotels.length ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {chainState.hotels.map((hotel) => {
                const dailyReport = financeByHotel.get(hotel.id);
                const isActive = hotel.id === chainState.activeHotelId;
                return (
                  <li key={hotel.id} className={`rounded-lg border p-3 ${isActive ? "border-cyan-600 bg-cyan-50/60" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{hotel.name}</p>
                        <p className="text-xs text-slate-500">{hotel.city} · {hotel.hotelState.structure.roomCount} chambres</p>
                      </div>
                      {isActive && <Badge type="info">Actif</Badge>}
                    </div>
                    {dailyReport && (
                      <p className={`mt-2 text-sm font-medium ${dailyReport.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {dailyReport.profit >= 0 ? "+" : ""}{Math.round(dailyReport.profit).toLocaleString()} € aujourd'hui
                      </p>
                    )}
                    {!isActive && (
                      <div className="mt-2">
                        <Button variant="outline" onClick={() => switchHotel(hotel.id)}>
                          Basculer sur cet hôtel
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
              Ajoutez un premier hôtel pour démarrer la chaîne.
            </p>
          )}
        </div>
      </Card>

      <Card title="Carte de la chaîne">
        <WorldMap hotels={chainState.hotels} activeHotelId={chainState.activeHotelId} onSelect={switchHotel} />
        {activeHotel && <p className="mt-2 text-xs text-slate-500">Hôtel actif : {activeHotel.name} ({activeHotel.city})</p>}
      </Card>

      {chainReport && (
        <>
          <section aria-labelledby="chain-finance" className="flex flex-col gap-3">
            <h2 id="chain-finance" className="text-base font-semibold text-slate-900">Finances consolidées</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Revenu total" value={`${chainReport.finance.totalRevenue.toLocaleString()} €`} />
              <KpiCard label="Dépenses totales" value={`${chainReport.finance.totalExpenses.toLocaleString()} €`} />
              <KpiCard label="Profit consolidé" value={`${chainReport.finance.totalProfit.toLocaleString()} €`} />
            </div>
          </section>

          <section aria-labelledby="chain-rm" className="flex flex-col gap-3">
            <h2 id="chain-rm" className="text-base font-semibold text-slate-900">RM consolidé</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <KpiCard label="Prévision 7 jours" value={`${chainReport.rm.consolidatedForecast.next7.toLocaleString()} €`} />
              <KpiCard label="Prévision 30 jours" value={`${chainReport.rm.consolidatedForecast.next30.toLocaleString()} €`} />
              <KpiCard label="Prévision 90 jours" value={`${chainReport.rm.consolidatedForecast.next90.toLocaleString()} €`} />
              <KpiCard label="ADR recommandé (chaîne)" value={`${chainReport.rm.recommendedADR} €`} />
            </div>
          </section>

          <section aria-labelledby="chain-events" className="flex flex-col gap-3">
            <h2 id="chain-events" className="text-base font-semibold text-slate-900">Événements régionaux & mondiaux</h2>
            <Card>
              {chainReport.events.regionalEvents.length || chainReport.events.globalEvents.length ? (
                <ul className="space-y-2">
                  {chainReport.events.regionalEvents.map((event, index) => (
                    <li key={EVENT_ID_KEY(event, index)} className="rounded-lg border border-slate-200 p-3">
                      <Badge type="warning">Régional · {event.city}</Badge>
                      <p className="mt-1 text-sm text-slate-700">{event.message}</p>
                    </li>
                  ))}
                  {chainReport.events.globalEvents.map((event, index) => (
                    <li key={EVENT_ID_KEY(event, index)} className="rounded-lg border border-slate-200 p-3">
                      <Badge type="info">Mondial</Badge>
                      <p className="mt-1 text-sm text-slate-700">{event.message}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">Aucun événement régional ou mondial aujourd'hui.</p>
              )}
            </Card>
          </section>

          <section aria-labelledby="chain-progression" className="flex flex-col gap-3">
            <h2 id="chain-progression" className="text-base font-semibold text-slate-900">Progression de la chaîne</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Niveau de la chaîne" value={`${chainReport.progression.chainLevel.level} · ${chainReport.progression.chainLevel.title}`} />
              <KpiCard label="XP de la chaîne" value={chainReport.progression.chainXP.toLocaleString()} />
              <KpiCard label="Réputation moyenne" value={`${chainReport.progression.chainReputation}/100`} />
            </div>
            {chainReport.progression.achievements.length > 0 && (
              <Card>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {chainReport.progression.achievements.map((achievement) => (
                    <li key={achievement.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-semibold text-amber-800">🏆 {achievement.name}</p>
                      <p className="text-xs text-amber-700">{achievement.description}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
