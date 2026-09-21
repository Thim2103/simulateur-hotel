// A pill that reads on the red band.
const pill = "inline-flex items-center rounded-xl bg-white px-2.5 py-0.5 text-xs font-semibold text-rose-700 shadow-sm";

// The dashboard's crisis alert: a red band that beats until the player has
// answered (see lib/mediaCrisis/), then keeps the crisis in view, calmly, until
// it is over. `crisis` is describeActiveCrisis()'s reading of it.
export function MediaCrisisBanner({ crisis, onOpen }) {
  if (!crisis) return null;
  const pending = !crisis.decided;
  return (
    <section
      role="alert"
      data-testid="media-crisis-banner"
      data-decided={crisis.decided ? "true" : "false"}
      aria-label={`Crise médiatique : ${crisis.title}`}
      className={`flex flex-col gap-3 rounded-2xl border p-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between ${
        pending ? "crisis-blink border-rose-300 bg-gradient-to-r from-rose-700 to-red-500" : "border-rose-200 bg-gradient-to-r from-rose-500 to-orange-500"
      }`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 text-2xl">{crisis.icon}</span>
        <div className="min-w-0">
          <h2 className="text-base font-bold">🚨 Crise médiatique : {crisis.title}</h2>
          <p className="text-sm text-white/90">{crisis.story}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={pill} data-testid="crisis-banner-reputation">Réputation −{crisis.reputationPenalty} pts</span>
            <span className={pill} data-testid="crisis-banner-demand">Demande −{crisis.demandDropPercent} %</span>
            <span className={pill} data-testid="crisis-banner-days">{crisis.daysLeft} jour{crisis.daysLeft > 1 ? "s" : ""} restant{crisis.daysLeft > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        data-testid="crisis-open"
        onClick={onOpen}
        className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {pending ? "Répondre à la crise" : "Voir la stratégie"}
      </button>
    </section>
  );
}

// After a successful rehabilitation: what the campaign still brings.
export function RehabBanner({ rehab }) {
  if (!rehab) return null;
  return (
    <section data-testid="rehab-banner" data-tone="success" role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-[var(--tone-soft)] p-3 text-sm text-emerald-900">
      <span aria-hidden="true" className="text-xl">🛡️</span>
      <span>
        <strong>« {rehab.title} »</strong> : +{rehab.boostPercent} % d'attractivité, encore {rehab.daysLeft} jour{rehab.daysLeft > 1 ? "s" : ""}.
      </span>
    </section>
  );
}

export default MediaCrisisBanner;
