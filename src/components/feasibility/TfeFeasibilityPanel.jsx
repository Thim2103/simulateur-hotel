import { useState } from "react";
import { BentoCard, StatusBadge } from "../../ui/bento";
import { describeInitialBalance } from "../../lib/feasibility/financingEngine";
import { describeDepreciationPlan } from "../../lib/feasibility/depreciationEngine";
import TfeProjectionsPanel from "./TfeProjectionsPanel";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const percent = (value) => `${Math.round(value * 100)} %`;

function Row({ code, label, value, testId }) {
  return (
    <tr data-testid={testId} className="border-b border-slate-100 last:border-0">
      <td className="py-1.5 pr-3 font-mono text-xs text-slate-500">{code}</td>
      <td className="py-1.5 pr-3 text-slate-700">{label}</td>
      <td className="py-1.5 text-right font-medium text-slate-900">{euro(value)}</td>
    </tr>
  );
}

function FinancingTab({ hotelState, day }) {
  const described = describeInitialBalance(hotelState, day);
  const { needs, resources } = described;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge tone={described.isFinancingSufficient ? "success" : "danger"} data-testid="tfe-financing-check">
          {described.isFinancingSufficient ? "✅ Financement suffisant" : "⚠️ Financement insuffisant"}
        </StatusBadge>
        <StatusBadge tone={described.isBalanced ? "success" : "danger"} data-testid="tfe-balance-check">
          {described.isBalanced ? "✅ Bilan initial équilibré" : "⚠️ Bilan initial déséquilibré"}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BentoCard as="div" tone="danger" title="Besoins d'investissement initial" icon="🧱" data-testid="tfe-needs-card">
          <table className="w-full text-sm">
            <tbody>
              <Row code="24/26" label="Immobilisations corporelles" value={needs.corporelles} testId="tfe-needs-corporelles" />
              <Row code={21} label="Immobilisations incorporelles" value={needs.incorporelles} testId="tfe-needs-incorporelles" />
              <Row code={200} label="Frais d'établissement" value={needs.fraisEtablissement} testId="tfe-needs-frais" />
              <Row code="BFR" label="Fonds de roulement de démarrage" value={needs.bfr} testId="tfe-needs-bfr" />
            </tbody>
          </table>
          <p data-testid="tfe-needs-total" className="mt-2 text-right text-sm font-bold text-slate-900">Total : {euro(needs.total)}</p>
        </BentoCard>

        <BentoCard as="div" tone="success" title="Ressources de financement" icon="🏦" data-testid="tfe-resources-card">
          <table className="w-full text-sm">
            <tbody>
              <Row code="100/110" label="Fonds propres / apport personnel" value={resources.apportPersonnel} testId="tfe-resources-apport" />
              <Row code={173} label="Emprunts bancaires long terme" value={resources.empruntsLT} testId="tfe-resources-emprunts" />
              <Row code={15} label="Subsides" value={resources.subsides} testId="tfe-resources-subsides" />
            </tbody>
          </table>
          <p data-testid="tfe-resources-total" className="mt-2 text-right text-sm font-bold text-slate-900">Total : {euro(resources.total)}</p>
        </BentoCard>
      </div>

      <BentoCard as="div" tone="action" title="Bilan initial prévisionnel (Jour 0)" icon="⚖️" data-testid="tfe-initial-balance-card">
        <p className="text-sm text-slate-600">
          Besoins ({euro(needs.total)}) + trésorerie de départ (<span data-testid="tfe-cash-cushion">{euro(described.cashCushion)}</span>) = Ressources ({euro(resources.total)})
        </p>
        <p data-testid="tfe-total-actif-initial" className="mt-1 text-sm font-semibold text-slate-900">Total Actif initial : {euro(described.totalActifInitial)}</p>
      </BentoCard>
    </div>
  );
}

function DepreciationTab({ hotelState, day }) {
  const plan = describeDepreciationPlan(hotelState, day);
  return (
    <div className="flex flex-col gap-4">
      <BentoCard as="div" tone="vip" title="Tableau synthétique par classe" icon="📊" data-testid="tfe-depreciation-summary">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-1 pr-2">Classe</th>
              <th className="pb-1 pr-2">VA</th>
              <th className="pb-1 pr-2">Dotation/an</th>
              <th className="pb-1 pr-2">Cumulés</th>
              <th className="pb-1">VCN</th>
            </tr>
          </thead>
          <tbody>
            {plan.byClass.map((entry) => (
              <tr key={entry.code} data-testid={`tfe-depreciation-class-${entry.code}`} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 pr-2 text-xs text-slate-600">
                  <span className="font-mono">{entry.code}</span> {entry.label}
                </td>
                <td className="py-1.5 pr-2 text-slate-900">{euro(entry.va)}</td>
                <td className="py-1.5 pr-2 text-slate-900">{euro(entry.annualDotation)}</td>
                <td className="py-1.5 pr-2 text-slate-900">{euro(entry.cumulative)}</td>
                <td className="py-1.5 text-slate-900">{euro(entry.vcn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p data-testid="tfe-depreciation-total" className="mt-2 text-right text-sm font-bold text-slate-900">Total : VA {euro(plan.total.va)} · Dotation/an {euro(plan.total.annualDotation)} · VCN {euro(plan.total.vcn)}</p>
      </BentoCard>

      <BentoCard as="div" tone="mice" title="Tableau individuel" icon="🧾" data-testid="tfe-depreciation-detail">
        {plan.lots.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun équipement acheté pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {plan.lots.map((lot, index) => (
              <li key={`${lot.accountCode}-${index}`} data-testid={`tfe-depreciation-lot-${lot.accountCode}-${index}`} className="rounded-xl border border-slate-100 p-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-900">{lot.label} <span className="font-mono text-slate-400">({lot.accountCode})</span></p>
                <p>VA {euro(lot.va)} · {lot.years} ans · taux {percent(lot.rate)} · dotation {euro(lot.annualDotation)}/an · cumulés {euro(lot.cumulative)} · VCN {euro(lot.vcn)}</p>
              </li>
            ))}
          </ul>
        )}
      </BentoCard>
    </div>
  );
}

const TABS = [
  { id: "financing", icon: "🧱", label: "Plan d'investissement & financement", tone: "action" },
  { id: "depreciation", icon: "📉", label: "Tableau des amortissements", tone: "vip" },
  { id: "chaffs", icon: "📈", label: "Projections & CHAFFs", tone: "success" },
  { id: "cashflow", icon: "💵", label: "Plan de trésorerie", tone: "action" },
  { id: "ratios", icon: "📐", label: "Ratios financiers & KPIs", tone: "mice" },
];

// The TFE feasibility desk: the initial investment & financing plan and its
// depreciation schedule (Partie 1, see lib/feasibility/financingEngine.js/
// depreciationEngine.js), then the CHAFFs, the cash-flow plan and the
// financial ratios/hotel KPIs (Partie 2, see
// lib/feasibility/financialProjectionsEngine.js/financialRatiosEngine.js) --
// five tabs, all reading the exact same live figures as the Bilan Comptable
// (components/accounting/), just regrouped under the TFE's own classes.
// `day` is the career's day; `dailyReport` (careerState.lastDayReport) feeds
// today's TrevPAR/CPOR/GOPPAR, when there is one.
export default function TfeFeasibilityPanel({ hotelState, restaurantState, rooms, day = 0, dailyReport }) {
  const [tab, setTab] = useState("financing");
  return (
    <div data-testid="tfe-feasibility-panel" className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Volets du plan de faisabilité">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            data-testid={`tfe-tab-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${tab === item.id ? "border-[var(--ds-action)] bg-[var(--ds-action)]/10 text-[var(--ds-action)]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {tab === "financing" && <FinancingTab hotelState={hotelState} day={day} />}
      {tab === "depreciation" && <DepreciationTab hotelState={hotelState} day={day} />}
      {(tab === "chaffs" || tab === "cashflow" || tab === "ratios") && (
        <TfeProjectionsPanel section={tab} hotelState={hotelState} restaurantState={restaurantState} rooms={rooms} day={day} dailyReport={dailyReport} />
      )}
    </div>
  );
}
