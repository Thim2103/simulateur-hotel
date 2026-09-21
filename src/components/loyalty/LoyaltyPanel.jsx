import { BentoCard, SoftButton, StatusBadge } from "../../ui/bento";
import { BENEFIT_IDS, LAUNCH_COST, TIERS, TIER_ORDER, describeProgram } from "../../lib/loyalty/loyaltyProgramEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const TIER_TONE = { silver: "neutral", gold: "vip", platinum: "mice" };

function Satisfaction({ value }) {
  const tone = value >= 80 ? "bg-[var(--ds-success)]" : value >= 65 ? "bg-[var(--ds-vip)]" : "bg-[var(--ds-action)]";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-slate-800">Satisfaction des membres</span>
        <span data-testid="loyalty-satisfaction-score" className="text-slate-700">
          <strong>{value}</strong>/100
        </span>
      </div>
      <div role="meter" aria-label="Satisfaction des membres" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} data-testid="loyalty-satisfaction" className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// The loyalty club desk (see lib/loyalty/loyaltyProgramEngine.js): launching the
// club, how many members it has at each level, what it saves and what it costs,
// and the perks to grant. `onLaunch()` unlocks the club and `onToggleBenefit(id,
// enabled)` turns a perk on or off -- Dashboard.jsx and the /clients/loyalty page
// wire them through applyHotelAdjustment(). Shared by LoyaltyProgramModal and
// the page.
export default function LoyaltyPanel({ hotelState, reservations, date, onLaunch, onToggleBenefit }) {
  const club = describeProgram(hotelState, { reservations, date });

  if (!club.launched) {
    return (
      <div data-testid="loyalty-panel" data-launched="false" className="flex flex-col gap-4">
        <BentoCard as="div" tone="vip" title={club.name} icon="🎖️">
          <p className="text-sm text-slate-700">
            Un club de fidélité fait revenir vos meilleurs clients : les membres réservent en direct (sans commission d'OTA), reviennent plus souvent et supportent mieux vos prix. En contrepartie, vous leur accordez des avantages.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3">
            {TIER_ORDER.map((tier) => (
              <li key={tier} className="rounded-xl bg-slate-50 p-2">
                <strong>{TIERS[tier].icon} {TIERS[tier].label}</strong>
                <br />
                {TIERS[tier].minStays === 1 ? "dès l'inscription" : `à partir de ${TIERS[tier].minStays} séjours`}
              </li>
            ))}
          </ul>
        </BentoCard>
        <div className="flex flex-wrap items-center gap-3">
          <SoftButton tone="vip" icon="🎖️" data-testid="loyalty-launch" disabled={!club.launch.available} onClick={() => onLaunch?.()}>
            Lancer le club · {euro(LAUNCH_COST)}
          </SoftButton>
          {club.launch.reason && (
            <span data-testid="loyalty-launch-reason" className="text-xs text-rose-700">
              {club.launch.reason}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="loyalty-panel" data-launched="true" className="flex flex-col gap-4">
      {club.lastOutcome && (
        <p data-testid="loyalty-outcome" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {club.lastOutcome.text}
        </p>
      )}

      <section aria-label="Membres du club" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Membres</h3>
          <StatusBadge tone="action" data-testid="loyalty-total">{club.members.total} membre{club.members.total > 1 ? "s" : ""}</StatusBadge>
        </div>
        <ul className="grid grid-cols-3 gap-2">
          {TIER_ORDER.map((tier) => (
            <li key={tier} data-testid={`loyalty-tier-${tier}`} data-tone={TIER_TONE[tier]} className="rounded-2xl border border-l-4 border-[var(--ds-border)] border-l-[var(--tone)] bg-white p-3 text-center shadow-[var(--ds-shadow-card)]">
              <p className="text-lg" aria-hidden="true">{TIERS[tier].icon}</p>
              <p className="text-xl font-bold text-slate-900" data-testid={`loyalty-count-${tier}`}>{club.members[tier]}</p>
              <p className="text-xs font-semibold text-slate-600">{TIERS[tier].label}</p>
            </li>
          ))}
        </ul>
      </section>

      <Satisfaction value={club.satisfaction} />

      <section aria-label="Effets du club" className="flex flex-wrap gap-2">
        <StatusBadge tone="success" data-testid="loyalty-effect-return">Retours +{club.effects.returnPercent} %</StatusBadge>
        <StatusBadge tone="action" data-testid="loyalty-effect-direct">{club.effects.directSharePercent} % des nouvelles réservations en direct</StatusBadge>
        <StatusBadge tone="vip" data-testid="loyalty-effect-price">Sensibilité aux prix −{club.effects.priceReliefPercent} %</StatusBadge>
      </section>

      <section aria-label="Résultats du club" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div data-testid="loyalty-conversion" data-tone="action" className="rounded-2xl bg-[var(--tone-soft)] p-3 text-sm text-slate-700">
          Réservations directes du club : <strong>{club.ledger.conversionPercent} %</strong>
          <span className="block text-xs text-slate-500">
            {club.ledger.memberBookings} sur {club.ledger.bookings} depuis le lancement
          </span>
        </div>
        <div data-testid="loyalty-savings" data-tone="success" className="rounded-2xl bg-[var(--tone-soft)] p-3 text-sm text-slate-700">
          Économies de commission : <strong>{euro(club.ledger.savings)}</strong>
          <span className="block text-xs text-slate-500">commission d'OTA évitée</span>
        </div>
        <div data-testid="loyalty-cost" data-tone="vip" className="rounded-2xl bg-[var(--tone-soft)] p-3 text-sm text-slate-700">
          Coût des avantages : <strong>{euro(club.ledger.cost)}</strong>
          <span className="block text-xs text-slate-500">depuis le lancement</span>
        </div>
        <div data-testid="loyalty-tonight" data-tone="mice" className="rounded-2xl bg-[var(--tone-soft)] p-3 text-sm text-slate-700">
          Ce soir : <strong>{club.tonight.members} membre{club.tonight.members > 1 ? "s" : ""}</strong> à l'hôtel
          <span className="block text-xs text-slate-500">{euro(club.tonight.cost)} d'avantages</span>
        </div>
      </section>

      <section aria-label="Avantages" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Avantages accordés</h3>
        <ul className="flex flex-col gap-2">
          {BENEFIT_IDS.map((id) => {
            const perk = club.perks.find((item) => item.id === id);
            const goldOnly = perk.appliesTo.length < TIER_ORDER.length;
            return (
              <li key={id} data-testid={`loyalty-perk-${id}`} data-enabled={perk.enabled ? "true" : "false"} className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 shadow-[var(--ds-shadow-card)] ${perk.enabled ? "border-emerald-300 bg-emerald-50/50" : "border-[var(--ds-border)] bg-white"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    <span aria-hidden="true">{perk.icon}</span> {perk.label}
                  </p>
                  <p className="text-xs text-slate-600">{perk.description}</p>
                  <p className="text-xs text-slate-500">
                    {euro(perk.cost)} par nuit et par membre{goldOnly ? " (Gold et Platinum)" : ""} · satisfaction +{perk.bonus}
                  </p>
                </div>
                <SoftButton
                  role="switch"
                  aria-checked={perk.enabled}
                  aria-label={`Accorder : ${perk.label}`}
                  data-testid={`loyalty-toggle-${id}`}
                  tone={perk.enabled ? "success" : "neutral"}
                  onClick={() => onToggleBenefit?.(id, !perk.enabled)}
                  className="!px-3 !py-1 !text-xs"
                >
                  {perk.enabled ? "Activé" : "Désactivé"}
                </SoftButton>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
