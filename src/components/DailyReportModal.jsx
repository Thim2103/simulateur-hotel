import Badge from "./ui/Badge";
import Button from "./ui/Button";

function SummaryTile({ label, value, hint, tone = "default" }) {
  const toneClasses = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneClasses}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

const EVENT_BADGE_TYPE = { high: "danger", medium: "warning", low: "info" };

// Shown after each "Jour suivant" click: summarizes the DailyReport
// returned by useDailyCycle().advanceDay() (see lib/dailyCycle/runDailyCycle.js).
// Renders nothing if there is no report yet (report === null).
export default function DailyReportModal({ report, onClose }) {
  if (!report) return null;

  const { date, hotelRevenue = {}, restaurantRevenue = {}, expenses = {}, profit = 0, events = [], staffChanges = {}, reservationsChanges = {} } = report;
  const moraleChanges = staffChanges.moraleChanges || [];
  const departures = staffChanges.departures || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="daily-report-title" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Rapport journalier</p>
            <h2 id="daily-report-title" className="mt-1 text-xl font-bold text-slate-900">{date}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le rapport"
            className="rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryTile
            label="Revenu hôtel"
            value={`${hotelRevenue.netRevenue?.toLocaleString?.() ?? 0} €`}
            hint={`${hotelRevenue.occupiedRooms ?? 0} chambre(s) occupée(s) · commission OTA ${hotelRevenue.otaCommission ?? 0} €`}
          />
          <SummaryTile
            label="Revenu restaurant"
            value={`${restaurantRevenue.netRevenue?.toLocaleString?.() ?? 0} €`}
            hint={`Marge ${restaurantRevenue.margin ?? 0} € · TVA ${restaurantRevenue.vat ?? 0} €`}
          />
          <SummaryTile
            label="Dépenses"
            value={`${expenses.total?.toLocaleString?.() ?? 0} €`}
            hint={`Fixe ${expenses.fixed ?? 0} € · Variable ${expenses.variable ?? 0} €`}
          />
          <SummaryTile label="Profit du jour" value={`${profit >= 0 ? "+" : ""}${profit.toLocaleString?.() ?? profit} €`} tone={profit >= 0 ? "positive" : "negative"} />
        </div>

        <Section title="Événements du jour">
          {events.length ? (
            <ul className="space-y-2">
              {events.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <span className="text-sm text-slate-700">{event.message}</span>
                  <Badge type={EVENT_BADGE_TYPE[event.severity] || "info"}>{event.severity}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">Aucun événement notable aujourd'hui.</p>
          )}
        </Section>

        <Section title="Personnel">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat label="Effectif" value={staffChanges.headcount ?? 0} />
            <MiniStat label="Changements de moral" value={moraleChanges.length} />
            <MiniStat label="Départs" value={departures.length} />
          </div>
          {departures.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-rose-600">
              {departures.map((departure) => (
                <li key={departure.id}>{departure.name} a quitté l'équipe ({departure.reason}).</li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Réservations">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Arrivées" value={reservationsChanges.checkIns?.length ?? 0} />
            <MiniStat label="Départs" value={reservationsChanges.checkOuts?.length ?? 0} />
            <MiniStat label="No-show" value={reservationsChanges.noShows?.length ?? 0} />
          </div>
        </Section>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
