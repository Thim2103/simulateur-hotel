import { useState } from "react";
import GameModal from "../../ui/components/GameModal";
import { treasuryOf } from "../../lib/finance/investmentFunding";
import { getYieldConfig, RULE_IDS, RULE_LABELS, MIN_YIELD_MULTIPLIER, MAX_YIELD_MULTIPLIER } from "../../lib/rm/yieldManagementEngine";
import { CAMPAIGN_TYPES, activeCampaigns, campaignHistory, campaignStatus, describeCampaign } from "../../lib/marketing/targetedCampaigns";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const signedPercent = (value) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Math.round(value * 100))} %`;

const RULE_TEXT = {
  occupancy: (rule) => `Si l'hôtel est rempli à plus de ${rule.threshold} % la nuit de l'arrivée, les chambres restantes coûtent ${signedPercent(rule.adjustment)}.`,
  lastMinute: (rule) => `Si l'hôtel est rempli à moins de ${rule.threshold} % et que le client arrive dans ${rule.daysAhead} jour(s) ou moins : ${signedPercent(rule.adjustment)}.`,
  events: (rule) => `Pendant un festival, un salon ou la haute saison : ${signedPercent(rule.adjustment)}.`,
};

const CAMPAIGN_STATUS_TEXT = { active: "Une campagne de ce type est déjà en cours", "no-funds": "Trésorerie insuffisante" };

// A number field that keeps what the player is typing and only commits it
// (through `onCommit`) when they leave the field or press Enter -- so a
// half-typed "1" on the way to "15" is never saved.
function NumberField({ label, testId, value, min, max, step = 1, suffix, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    // An empty field is not a 0: it is put back to what it was.
    const parsed = draft.trim() === "" ? NaN : Number(draft);
    if (Number.isFinite(parsed) && parsed !== value) onCommit(parsed);
    else setDraft(String(value));
  };
  return (
    <label className="flex flex-col gap-0.5 text-xs text-slate-600">
      {label}
      <span className="flex items-center gap-1">
        <input
          type="number"
          data-testid={testId}
          value={draft}
          min={min}
          max={max}
          step={step}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && commit()}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-100"
        />
        {suffix}
      </span>
    </label>
  );
}

// The player's commercial levers (see lib/rm/yieldManagementEngine.js and
// lib/marketing/targetedCampaigns.js): automatic pricing rules and targeted
// marketing campaigns. `hotelState` is the hotel's current state and `date`
// the day about to be played; the callbacks do the actual changes --
// Dashboard.jsx wires them through applyHotelAdjustment().
export default function YieldMarketingModal({ hotelState, date, onSetYieldEnabled, onSetYieldRule, onLaunchCampaign, onClose }) {
  const config = getYieldConfig(hotelState);
  const running = activeCampaigns(hotelState).map((campaign) => describeCampaign(campaign, date));
  const history = campaignHistory(hotelState).slice(-5).reverse();

  return (
    <GameModal open onClose={onClose} title="📈 Yield management & marketing" className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto">
      <p className="text-sm text-slate-600">
        Trésorerie : <strong data-testid="growth-treasury">{euro(treasuryOf(hotelState))}</strong>
      </p>

      <section data-testid="yield-section" className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Yield management</p>
            <p className="text-xs text-slate-600">
              Tarification automatique des nouvelles réservations, entre ×{MIN_YIELD_MULTIPLIER} et ×{MAX_YIELD_MULTIPLIER} du prix habituel.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            aria-label="Activer le yield management"
            data-testid="yield-toggle"
            onClick={() => onSetYieldEnabled?.(!config.enabled)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${config.enabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}
          >
            {config.enabled ? "Activé" : "Désactivé"}
          </button>
        </div>

        {RULE_IDS.map((ruleId) => {
          const rule = config[ruleId];
          return (
            <div key={ruleId} data-testid={`yield-rule-${ruleId}`} data-enabled={rule.enabled ? "true" : "false"} className={`flex flex-col gap-2 rounded-md border p-2 ${config.enabled ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  data-testid={`yield-rule-${ruleId}-enabled`}
                  checked={rule.enabled}
                  onChange={(event) => onSetYieldRule?.(ruleId, { enabled: event.target.checked })}
                  className="accent-cyan-700"
                />
                {RULE_LABELS[ruleId]}
              </label>
              <p className="text-xs text-slate-600">{RULE_TEXT[ruleId](rule)}</p>
              <div className="flex flex-wrap gap-3">
                {ruleId !== "events" && (
                  <NumberField
                    key={`${ruleId}-threshold-${rule.threshold}`}
                    label="Seuil d'occupation"
                    testId={`yield-rule-${ruleId}-threshold`}
                    value={rule.threshold}
                    min={0}
                    max={100}
                    suffix="%"
                    onCommit={(value) => onSetYieldRule?.(ruleId, { threshold: value })}
                  />
                )}
                {ruleId === "lastMinute" && (
                  <NumberField
                    key={`${ruleId}-days-${rule.daysAhead}`}
                    label="Arrivée dans"
                    testId="yield-rule-lastMinute-daysAhead"
                    value={rule.daysAhead}
                    min={0}
                    max={7}
                    suffix="j max"
                    onCommit={(value) => onSetYieldRule?.(ruleId, { daysAhead: value })}
                  />
                )}
                <NumberField
                  key={`${ruleId}-adjustment-${rule.adjustment}`}
                  label="Ajustement de prix"
                  testId={`yield-rule-${ruleId}-adjustment`}
                  value={Math.round(rule.adjustment * 100)}
                  min={ruleId === "lastMinute" ? -50 : 0}
                  max={ruleId === "lastMinute" ? 0 : 50}
                  suffix="%"
                  onCommit={(value) => onSetYieldRule?.(ruleId, { adjustment: value / 100 })}
                />
              </div>
            </div>
          );
        })}
      </section>

      <section data-testid="campaigns-section" className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-900">Campagnes marketing ciblées</p>
        {Object.values(CAMPAIGN_TYPES).map((type) => {
          const status = campaignStatus(hotelState, type.id);
          return (
            <div key={type.id} data-testid={`campaign-${type.id}`} data-status={status} className="flex flex-col gap-1 rounded-md border border-slate-200 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  <span aria-hidden="true">{type.icon}</span> {type.name}
                </p>
                <button
                  type="button"
                  data-testid={`campaign-${type.id}-launch`}
                  disabled={status !== "available"}
                  onClick={() => onLaunchCampaign?.(type.id)}
                  className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Lancer
                </button>
              </div>
              <p className="text-xs text-slate-600">{type.description}</p>
              <p className="text-xs text-slate-500">
                Cible : {type.target} · {euro(type.cost)} · {type.durationDays} jours
              </p>
              {CAMPAIGN_STATUS_TEXT[status] && (
                <p data-testid={`campaign-${type.id}-status`} className="text-xs text-slate-500">
                  {CAMPAIGN_STATUS_TEXT[status]}
                </p>
              )}
            </div>
          );
        })}

        {running.length > 0 && (
          <div data-testid="campaigns-running" className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-slate-700">En cours</p>
            {running.map((campaign) => (
              <p key={campaign.id} data-testid={`campaign-running-${campaign.typeId}`} className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-900">
                {campaign.icon} {campaign.name} — {campaign.daysLeft} jour(s) restant(s) · {campaign.extraBookings.toLocaleString("fr-FR")} réservation(s) supplémentaire(s) · {euro(campaign.extraRevenue)} générés pour {euro(campaign.cost)} investis
              </p>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div data-testid="campaigns-history" className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-slate-700">Terminées</p>
            {history.map((campaign) => {
              const described = describeCampaign(campaign, campaign.endedOn);
              return (
                <p key={campaign.id} data-testid={`campaign-history-${campaign.typeId}`} className="rounded-md bg-slate-50 p-2 text-xs text-slate-700">
                  {described.icon} {described.name} — {described.extraBookings.toLocaleString("fr-FR")} réservation(s) · {euro(described.extraRevenue)} · ROI {described.roi >= 0 ? "+" : "−"}
                  {Math.abs(Math.round(described.roi * 100))} %
                </p>
              );
            })}
          </div>
        )}
      </section>
    </GameModal>
  );
}
