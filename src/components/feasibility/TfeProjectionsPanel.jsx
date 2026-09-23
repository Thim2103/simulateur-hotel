import { BentoCard, StatusBadge } from "../../ui/bento";
import { PROJECTION_YEARS, describeProjections } from "../../lib/feasibility/financialProjectionsEngine";
import { describeFinancialAnalysis } from "../../lib/feasibility/financialRatiosEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const euroOrDash = (value) => (value === null || value === undefined ? "—" : euro(value));
const percentOrDash = (value) => (value === null || value === undefined ? "—" : `${Math.round(value * 100)} %`);
const numberOrDash = (value) => (value === null || value === undefined ? "—" : value.toLocaleString("fr-FR"));

function YearlyTable({ testId, columns, rows }) {
  return (
    <table data-testid={testId} className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
          <th className="pb-1 pr-2">Poste</th>
          {PROJECTION_YEARS.map((year) => (
            <th key={year} className="pb-1 pr-2 text-right">An {year}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {columns.map((column) => (
          <tr key={column.key} data-testid={`${testId}-row-${column.key}`} className="border-b border-slate-100 last:border-0">
            <td className="py-1.5 pr-2 text-slate-700">{column.label}</td>
            {rows.map((row) => (
              <td key={row.year} className="py-1.5 pr-2 text-right text-slate-900">{euro(column.value(row))}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChaffsSection({ projections }) {
  return (
    <div className="flex flex-col gap-4">
      <BentoCard as="div" tone="success" title="CHAFFs — Chiffre d'affaires prévisionnel" icon="📈" data-testid="tfe-chaffs-card">
        <YearlyTable
          testId="tfe-chaffs-table"
          rows={projections.revenue}
          columns={[
            { key: "704", label: "704 Hébergement", value: (row) => row.hebergement },
            { key: "702-703", label: "702/703 Restauration & Bar", value: (row) => row.restauration },
            { key: "707", label: "707 Services annexes", value: (row) => row.servicesAnnexes },
          ]}
        />
        <p data-testid="tfe-chaffs-total" className="mt-2 text-right text-sm font-bold text-slate-900">
          Total An {PROJECTION_YEARS.length} : {euro(projections.revenue[projections.revenue.length - 1].total)}
        </p>
      </BentoCard>

      <BentoCard as="div" tone="danger" title="Compte de résultat prévisionnel" icon="🧮" data-testid="tfe-income-statement-card">
        <YearlyTable
          testId="tfe-income-statement-table"
          rows={projections.incomeStatement}
          columns={[
            { key: "600", label: "600/604 Achats F&B", value: (row) => row.charges.achatsFB },
            { key: "609", label: "609 Variation de stocks", value: (row) => row.charges.variationStocks },
            { key: "61", label: "61 Services & biens divers", value: (row) => row.charges.sbd },
            { key: "62", label: "62 Masse salariale", value: (row) => row.charges.masseSalariale },
            { key: "630", label: "630 Amortissements", value: (row) => row.charges.amortissements },
            { key: "650", label: "650 Charges financières", value: (row) => row.charges.interets },
          ]}
        />
        <table className="mt-2 w-full text-sm">
          <tbody>
            <tr data-testid="tfe-income-statement-ebitda">
              <td className="py-1 pr-2 font-semibold text-slate-700">EBE (EBITDA)</td>
              {projections.incomeStatement.map((row) => (
                <td key={row.year} className="py-1 pr-2 text-right font-semibold text-slate-900">{euro(row.ebitda)}</td>
              ))}
            </tr>
            <tr data-testid="tfe-income-statement-net">
              <td className="py-1 pr-2 font-bold text-slate-900">Résultat net</td>
              {projections.incomeStatement.map((row) => (
                <td key={row.year} className={`py-1 pr-2 text-right font-bold ${row.resultatNet >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{euro(row.resultatNet)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </BentoCard>
    </div>
  );
}

function CashFlowSection({ projections }) {
  return (
    <BentoCard as="div" tone="action" title="Plan de trésorerie (méthode indirecte)" icon="💵" data-testid="tfe-cashflow-card">
      <table data-testid="tfe-cashflow-table" className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-1 pr-2">An</th>
            <th className="pb-1 pr-2 text-right">Résultat net</th>
            <th className="pb-1 pr-2 text-right">+ Amortissements</th>
            <th className="pb-1 pr-2 text-right">− Variation stocks</th>
            <th className="pb-1 pr-2 text-right">Cash-flow</th>
            <th className="pb-1 text-right">Cumulé</th>
          </tr>
        </thead>
        <tbody>
          {projections.cashFlow.map((row) => (
            <tr key={row.year} data-testid={`tfe-cashflow-row-${row.year}`} className="border-b border-slate-100 last:border-0">
              <td className="py-1.5 pr-2 text-slate-700">{row.year}</td>
              <td className="py-1.5 pr-2 text-right text-slate-900">{euro(row.resultatNet)}</td>
              <td className="py-1.5 pr-2 text-right text-slate-900">{euro(row.amortissements)}</td>
              <td className="py-1.5 pr-2 text-right text-slate-900">{euro(row.variationStocks)}</td>
              <td className="py-1.5 pr-2 text-right font-semibold text-slate-900">{euro(row.cashFlow)}</td>
              <td data-testid={`tfe-cashflow-cumulative-${row.year}`} className={`py-1.5 text-right font-bold ${row.cumulative >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{euro(row.cumulative)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[projections.balanceSheetYear3, projections.balanceSheetYear5].map((sheet) => (
          <div key={sheet.year} data-testid={`tfe-balance-sheet-year-${sheet.year}`} className="rounded-2xl border border-slate-100 p-3 text-xs text-slate-600">
            <p className="mb-1 text-sm font-semibold text-slate-900">Bilan prévisionnel — Année {sheet.year}</p>
            <p>Actif : immo. nette {euro(sheet.actif.immobilisationsNet)} · stocks {euro(sheet.actif.stocks)} · trésorerie {euro(sheet.actif.tresorerie)}</p>
            <p>Passif : capitaux propres {euro(sheet.passif.capitauxPropres)} · emprunts {euro(sheet.passif.emprunts)} · dettes {euro(sheet.passif.dettes)}</p>
            <StatusBadge tone={sheet.isBalanced ? "success" : "danger"} data-testid={`tfe-balance-sheet-check-${sheet.year}`} className="mt-1">
              {sheet.isBalanced ? "✅ Équilibré" : "⚠️ Déséquilibré"}
            </StatusBadge>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

function RatiosSection({ analysis }) {
  const { masses, ratios, kpis } = analysis;
  return (
    <div className="flex flex-col gap-4">
      <BentoCard as="div" tone="vip" title="Masses bilantaires" icon="⚖️" data-testid="tfe-masses-card">
        <div className="flex flex-wrap gap-3 text-sm">
          <p data-testid="tfe-masses-fr">FR : <span className="font-semibold text-slate-900">{euro(masses.fr)}</span></p>
          <p data-testid="tfe-masses-bfr">BFR : <span className="font-semibold text-slate-900">{euro(masses.bfr)}</span></p>
          <p data-testid="tfe-masses-tn">TN : <span className="font-semibold text-slate-900">{euro(masses.tn)}</span></p>
          <StatusBadge tone={masses.isConsistent ? "success" : "danger"} data-testid="tfe-masses-check">
            {masses.isConsistent ? "✅ FR − BFR = trésorerie" : "⚠️ Incohérence"}
          </StatusBadge>
        </div>
      </BentoCard>

      <BentoCard as="div" tone="mice" title="Ratios financiers" icon="📐" data-testid="tfe-ratios-card">
        <table className="w-full text-sm">
          <tbody>
            {[
              ["tfe-ratio-solvabilite", "Solvabilité", ratios.solvabilite, "x"],
              ["tfe-ratio-liquidite-generale", "Liquidité générale", ratios.liquiditeGenerale, "x"],
              ["tfe-ratio-liquidite-reduite", "Liquidité réduite", ratios.liquiditeReduite, "x"],
              ["tfe-ratio-autonomie", "Autonomie financière", ratios.autonomieFinanciere, "%"],
              ["tfe-ratio-ebitda", "Marge d'EBE (EBITDA)", ratios.margeEbitda, "%"],
              ["tfe-ratio-roe", "ROE", ratios.roe, "%"],
              ["tfe-ratio-roa", "ROA", ratios.roa, "%"],
            ].map(([testId, label, value, unit]) => (
              <tr key={testId} data-testid={testId} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 pr-2 text-slate-700">{label}</td>
                <td className="py-1.5 text-right font-semibold text-slate-900">{unit === "%" ? percentOrDash(value) : value === null ? "—" : `${value.toLocaleString("fr-FR")} x`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </BentoCard>

      <BentoCard as="div" tone="success" title="KPIs hôteliers" icon="🏨" data-testid="tfe-kpis-card">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["tfe-kpi-occupancy", "Taux d'occupation", `${kpis.occupancyRate} %`],
            ["tfe-kpi-adr", "ADR", euroOrDash(kpis.adr)],
            ["tfe-kpi-revpar", "RevPAR", euroOrDash(kpis.revpar)],
            ["tfe-kpi-trevpar", "TrevPAR", euroOrDash(kpis.trevpar)],
            ["tfe-kpi-cpor", "CPOR", euroOrDash(kpis.cpor)],
            ["tfe-kpi-goppar", "GOPPAR", euroOrDash(kpis.goppar)],
          ].map(([testId, label, value]) => (
            <div key={testId} data-testid={testId} className="rounded-xl bg-slate-50 p-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-sm font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">{numberOrDash(kpis.occupiedRooms)} / {numberOrDash(kpis.totalRooms)} chambres occupées ce soir.</p>
      </BentoCard>
    </div>
  );
}

// TFE, Partie 2 -- CHAFFs & projections pluriannuelles, plan de trésorerie
// et analyse financière/KPIs, all read live (see lib/feasibility/
// financialProjectionsEngine.js and financialRatiosEngine.js). `section`
// picks which one to render; TfeFeasibilityPanel.jsx wires each as its own
// top-level tab, alongside the financing plan and the depreciation schedule
// (Partie 1).
export default function TfeProjectionsPanel({ section, hotelState, restaurantState, rooms, day = 0, dailyReport }) {
  const args = { restaurantState, rooms, day };
  if (section === "chaffs") return <ChaffsSection projections={describeProjections(hotelState, args)} />;
  if (section === "cashflow") return <CashFlowSection projections={describeProjections(hotelState, args)} />;
  const analysis = describeFinancialAnalysis(hotelState, restaurantState, rooms, { day, dailyRevenue: dailyReport?.hotelRevenue?.netRevenue, dailyCosts: dailyReport?.expenses?.total });
  return <RatiosSection analysis={analysis} />;
}
