import { useState } from "react";
import { BentoCard, StatusBadge } from "../../ui/bento";
import { describeAccounting } from "../../lib/accounting/accountingEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;

function ExpertRow({ code, label, value }) {
  return (
    <tr data-testid={`accounting-row-${code}`} className="border-b border-slate-100 last:border-0">
      <td className="py-1.5 pr-3 font-mono text-xs text-slate-500">{code}</td>
      <td className="py-1.5 pr-3 text-slate-700">{label}</td>
      <td className="py-1.5 text-right font-medium text-slate-900">{euro(value)}</td>
    </tr>
  );
}

function ExpertTable({ title, tone, rows }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500" data-tone={tone}>{title}</p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <ExpertRow key={row.code} {...row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The Bilan Comptable & Compte de Résultat desk (see
// lib/accounting/accountingEngine.js): a Débutant view (Bento cards, plain
// words) and an Expert PCMN view (every account, its real number and its
// label) behind one toggle, both reading the exact same computed figures --
// switching mode never changes what the numbers say, only how detailed the
// reading is. `day` is the career's day, for depreciation. Shared by
// AccountingModal.
export default function AccountingPanel({ hotelState, restaurantState, day = 0 }) {
  const [mode, setMode] = useState("beginner");
  const described = describeAccounting(hotelState, restaurantState, { day });
  const { assets, liabilities, incomeStatement, isBalanced, labels } = described;

  return (
    <div data-testid="accounting-panel" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5" role="tablist" aria-label="Niveau de lecture">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "beginner"}
            data-testid="accounting-mode-beginner"
            onClick={() => setMode("beginner")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${mode === "beginner" ? "border-[var(--ds-action)] bg-[var(--ds-action)]/10 text-[var(--ds-action)]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            🎓 Débutant
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "expert"}
            data-testid="accounting-mode-expert"
            onClick={() => setMode("expert")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${mode === "expert" ? "border-[var(--ds-vip)] bg-[var(--ds-vip)]/10 text-[var(--ds-vip)]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            📐 Expert PCMN
          </button>
        </div>
        <StatusBadge tone={isBalanced ? "success" : "danger"} data-testid="accounting-balance-check">
          {isBalanced ? "✅ Bilan équilibré" : "⚠️ Bilan déséquilibré"}
        </StatusBadge>
      </div>

      {mode === "beginner" ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <BentoCard as="div" tone="action" title="Actif immobilisé" icon="🏛️" data-testid="accounting-card-immo">
              <p className="text-xl font-bold text-slate-900">{euro(assets.immobilisations.net)}</p>
              <p className="text-xs text-slate-500">Valeur nette (brut {euro(assets.immobilisations.gross)}, amorti {euro(assets.immobilisations.depreciation)})</p>
            </BentoCard>
            <BentoCard as="div" tone="mice" title="Stocks" icon="📦" data-testid="accounting-card-stocks">
              <p className="text-xl font-bold text-slate-900">{euro(assets.stocks.total)}</p>
            </BentoCard>
            <BentoCard as="div" tone="success" title="Trésorerie" icon="💵" data-testid="accounting-card-treasury">
              <p className="text-xl font-bold text-slate-900">{euro(assets.treasury.total)}</p>
              <p className="text-xs text-slate-500">dont {euro(assets.treasury.capital)} de capital de croissance</p>
            </BentoCard>
            <BentoCard as="div" tone="vip" title="Fonds propres" icon="🏦" data-testid="accounting-card-equity">
              <p className="text-xl font-bold text-slate-900">{euro(liabilities.equity)}</p>
            </BentoCard>
            <BentoCard as="div" tone="danger" title="Dettes bancaires" icon="🏛️" data-testid="accounting-card-loans">
              <p className="text-xl font-bold text-slate-900">{euro(liabilities.loans)}</p>
            </BentoCard>
            {liabilities.overdraft > 0 && (
              <BentoCard as="div" tone="danger" title="Découvert bancaire" icon="⚠️" data-testid="accounting-card-overdraft">
                <p className="text-xl font-bold text-slate-900">{euro(liabilities.overdraft)}</p>
              </BentoCard>
            )}
          </div>

          <BentoCard as="div" tone="action" title="Compte de résultat, en clair" icon="🧮" data-testid="accounting-result-card">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <span data-testid="accounting-result-revenue" className="font-semibold text-emerald-700">{euro(incomeStatement.produits.total)}</span>
              <span>de recettes</span>
              <span>−</span>
              <span data-testid="accounting-result-charges" className="font-semibold text-rose-700">{euro(incomeStatement.charges.total)}</span>
              <span>de charges</span>
              <span>=</span>
              <span data-testid="accounting-result-net" className={`font-bold ${incomeStatement.resultatNet >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {euro(incomeStatement.resultatNet)}
              </span>
              <span>de résultat net</span>
            </div>
          </BentoCard>
        </div>
      ) : (
        <div data-testid="accounting-expert-tables" className="flex flex-col gap-4">
          <ExpertTable
            title="Actif"
            tone="action"
            rows={[
              ...assets.immobilisations.byAccount.map((entry) => ({ code: entry.accountCode, label: `${entry.label} (net)`, value: entry.net })),
              ...assets.stocks.byAccount.map((entry) => ({ code: entry.accountCode, label: entry.label, value: entry.total })),
              { code: 5500, label: labels[5500], value: assets.treasury.total },
            ]}
          />
          <ExpertTable
            title="Passif"
            tone="vip"
            rows={[
              { code: 100, label: labels[100], value: liabilities.equity },
              { code: 173, label: labels[173], value: liabilities.loans },
              ...(liabilities.overdraft > 0 ? [{ code: 4300, label: labels[4300], value: liabilities.overdraft }] : []),
            ]}
          />
          <ExpertTable
            title="Produits (Classe 7)"
            tone="success"
            rows={[
              { code: 704, label: labels[704], value: incomeStatement.produits.hebergement },
              { code: 702, label: labels[702], value: incomeStatement.produits.restauration },
              { code: 707, label: labels[707], value: incomeStatement.produits.servicesAnnexes },
            ]}
          />
          <ExpertTable
            title="Charges (Classe 6)"
            tone="danger"
            rows={[
              { code: 600, label: labels[600], value: incomeStatement.charges.achatsFB },
              { code: 61, label: labels[61], value: incomeStatement.charges.servicesEtBiensDivers },
              { code: 620, label: labels[620], value: incomeStatement.charges.masseSalarialeEtAutres },
              { code: 630, label: labels[630], value: incomeStatement.charges.amortissements },
              { code: 650, label: labels[650], value: incomeStatement.charges.interets },
            ]}
          />
        </div>
      )}
    </div>
  );
}
