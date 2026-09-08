import { useEffect } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useChainContext } from "../context/ChainContext";
import { useStaff } from "../hooks/useStaff";

const PRIORITY_BADGE_TYPE = { high: "danger", medium: "warning", low: "info" };

function EmptyList({ children }) {
  return <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">{children}</p>;
}

// `isScore` renders a "/100" morale score with a color-coded tone; without
// it (e.g. a plain headcount) the value is shown as-is, in neutral slate.
function MoraleTile({ label, value, isScore = false }) {
  const isEmpty = value === null || value === undefined;
  const tone = !isScore || isEmpty ? "text-slate-700" : value >= 60 ? "text-emerald-600" : value >= 40 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{isEmpty ? "—" : isScore ? `${value}/100` : value}</p>
    </div>
  );
}

// Multi-site (Chain) staff management: global/local headcount and
// morale, transfers, training, promotions, and regional HR events -- all
// produced by lib/staffMulti/staffEngine.js (the same engine chainEngine.
// runChainCycle() runs once per chain cycle). Reuses the chain state from
// useChain() so this page reflects whichever hotels the chain currently
// has.
//
// Formerly StaffDashboard.jsx at /staff -- renamed and moved to
// /chain/staff (see App.js) when the Refonte RH request replaced /staff
// with the Career/Guest-Mode Staff module (see pages/StaffDashboard.jsx,
// lib/staff/). Not to be confused with that module: this page is
// chain-only (useChainContext()/hooks/useStaff.js), with no Career/Guest
// Mode awareness of its own.
export default function ChainStaffDashboard() {
  const { chainState } = useChainContext();
  const { staffState, setHotels, staffReport, optimizeStaff, isRunning, error } = useStaff();

  useEffect(() => {
    setHotels(chainState.hotels);
  }, [chainState.hotels, setHotels]);

  const hotelNameById = new Map(staffState.hotels.map((hotel) => [hotel.id, hotel.name]));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Ressources humaines multi-sites</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Gestion du personnel</h1>
          <p className="mt-1 text-sm text-slate-500">Moral, transferts, formation, promotions et événements RH sur l'ensemble de la chaîne.</p>
        </div>
        <Button onClick={() => optimizeStaff().catch(() => undefined)} disabled={isRunning || staffState.hotels.length === 0}>
          {isRunning ? "Calcul en cours…" : "Optimiser le personnel"}
        </Button>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Impossible de calculer le rapport RH : {error.message}
        </div>
      )}

      {staffState.hotels.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Aucun hôtel dans la chaîne pour le moment : ajoutez-en un depuis la page « Chaîne d'hôtels ».
        </div>
      )}

      {!staffReport && staffState.hotels.length > 0 && !error && (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {isRunning ? "Calcul du rapport RH en cours…" : "Cliquez sur « Optimiser le personnel » pour lancer une première analyse."}
        </div>
      )}

      {staffReport && (
        <>
          <section aria-labelledby="staff-overview" className="flex flex-col gap-3">
            <h2 id="staff-overview" className="text-base font-semibold text-slate-900">Effectif & moral global</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KpiCard label="Effectif total" value={staffReport.staffGlobal.length} />
              <KpiCard label="Moral global" value={staffReport.moraleGlobal === null ? "—" : `${staffReport.moraleGlobal}/100`} />
            </div>
          </section>

          <section aria-labelledby="staff-by-hotel" className="flex flex-col gap-3">
            <h2 id="staff-by-hotel" className="text-base font-semibold text-slate-900">Effectif & moral par hôtel</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(staffReport.staffByHotel).map(([hotelId, staff]) => (
                <Card key={hotelId} title={hotelNameById.get(hotelId) || hotelId}>
                  <div className="grid grid-cols-2 gap-3">
                    <MoraleTile label="Effectif" value={staff.length} />
                    <MoraleTile label="Moral" value={staffReport.moraleByHotel[hotelId]} isScore />
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="staff-transfers" className="flex flex-col gap-3">
            <h2 id="staff-transfers" className="text-base font-semibold text-slate-900">Transferts</h2>
            <Card>
              {staffReport.transfers.length ? (
                <ul className="space-y-2">
                  {staffReport.transfers.map((transfer) => (
                    <li key={transfer.staffId} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">
                        {transfer.staffName} : {hotelNameById.get(transfer.fromHotelId) || transfer.fromHotelId} → {hotelNameById.get(transfer.toHotelId) || transfer.toHotelId}
                      </p>
                      <p className="text-xs text-slate-500">{transfer.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList>Aucun transfert ce cycle.</EmptyList>
              )}
            </Card>
          </section>

          <section aria-labelledby="staff-training" className="flex flex-col gap-3">
            <h2 id="staff-training" className="text-base font-semibold text-slate-900">Formation</h2>
            <Card>
              {staffReport.training.length ? (
                <ul className="space-y-2">
                  {staffReport.training.map((record) => (
                    <li key={record.staffId} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                      {record.staffName} ({hotelNameById.get(record.hotelId) || record.hotelId}) : compétence {record.skillBefore} → {record.skillAfter}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList>Aucune formation ce cycle.</EmptyList>
              )}
            </Card>
          </section>

          <section aria-labelledby="staff-promotions" className="flex flex-col gap-3">
            <h2 id="staff-promotions" className="text-base font-semibold text-slate-900">Promotions</h2>
            <Card>
              {staffReport.promotions.length ? (
                <ul className="space-y-2">
                  {staffReport.promotions.map((promotion) => (
                    <li key={promotion.staffId} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      {promotion.staffName} ({hotelNameById.get(promotion.hotelId) || promotion.hotelId}) : {promotion.fromRole} → {promotion.toRole}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList>Aucune promotion ce cycle.</EmptyList>
              )}
            </Card>
          </section>

          <section aria-labelledby="staff-events" className="flex flex-col gap-3">
            <h2 id="staff-events" className="text-base font-semibold text-slate-900">Événements RH régionaux</h2>
            <Card>
              {staffReport.regionalEvents.length ? (
                <ul className="space-y-2">
                  {staffReport.regionalEvents.map((event) => (
                    <li key={event.id} className="rounded-lg border border-slate-200 p-3">
                      <Badge type="warning">{event.city}</Badge>
                      <p className="mt-1 text-sm text-slate-700">{event.message}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList>Aucun événement RH régional ce cycle.</EmptyList>
              )}
            </Card>
          </section>

          <section aria-labelledby="staff-recommendations" className="flex flex-col gap-3">
            <h2 id="staff-recommendations" className="text-base font-semibold text-slate-900">Recommandations RH</h2>
            <Card>
              {staffReport.optimization.recommendations.length ? (
                <ul className="space-y-2">
                  {staffReport.optimization.recommendations.map((recommendation) => (
                    <li key={recommendation.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                      <span className="text-sm text-slate-700">{recommendation.message}</span>
                      <Badge type={PRIORITY_BADGE_TYPE[recommendation.priority] || "info"}>{recommendation.priority}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList>Aucune recommandation RH pour le moment.</EmptyList>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
