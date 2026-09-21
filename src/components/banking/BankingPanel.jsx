import { useState } from "react";
import { BentoCard, SoftButton, StatusBadge } from "../../ui/bento";
import { LOAN_TYPES, LOAN_TYPE_IDS, describeBanking, quote } from "../../lib/banking/bankingLoanEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const euro2 = (value) => `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const RATE_TONE = { cash: "danger", investment: "vip", bond: "success" };

function amountsOf(type, maxAmount) {
  const list = [];
  for (let value = type.min; value <= Math.min(type.max, Math.max(maxAmount, type.min)); value += type.step) list.push(value);
  return list;
}

// One loan the bank offers: how much, over how long, at what cost, and the
// button. A refusal says why.
function OfferCard({ option, onTake }) {
  const type = LOAN_TYPES[option.type];
  const choices = amountsOf(type, option.maxAmount);
  const [amount, setAmount] = useState(type.min);
  const shown = choices.includes(amount) ? amount : choices[choices.length - 1];
  const priced = quote(option.type, shown);

  return (
    <li
      data-testid={`banking-offer-${option.type}`}
      data-available={option.available ? "true" : "false"}
      data-tone={RATE_TONE[option.type]}
      className="flex flex-col gap-2 rounded-2xl border border-l-4 border-[var(--ds-border)] border-l-[var(--tone)] bg-white p-3 shadow-[var(--ds-shadow-card)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          <span aria-hidden="true">{type.icon}</span> {type.label}
        </p>
        <div className="flex gap-1.5">
          <StatusBadge tone={RATE_TONE[option.type]}>Taux {type.rateLabel}</StatusBadge>
          <StatusBadge tone="neutral">{type.termDays} jours</StatusBadge>
        </div>
      </div>
      <p className="text-xs text-slate-600">{type.description}</p>

      <div className="flex flex-wrap items-end gap-3">
        {type.min === type.max ? (
          <p data-testid={`banking-fixed-${option.type}`} className="text-sm font-semibold text-slate-900">{euro(type.min)}</p>
        ) : (
          <label className="flex flex-col gap-0.5 text-xs text-slate-600">
            Montant
            <select
              data-testid={`banking-amount-${option.type}`}
              aria-label={`Montant : ${type.label}`}
              value={shown}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="rounded-xl border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {choices.map((value) => (
                <option key={value} value={value}>
                  {euro(value)}
                </option>
              ))}
            </select>
          </label>
        )}
        <SoftButton tone="success" icon="🏦" data-testid={`banking-take-${option.type}`} disabled={!option.available} onClick={() => onTake?.(option.type, shown)} className="!px-3 !py-1.5 !text-xs">
          Emprunter
        </SoftButton>
      </div>

      <p data-testid={`banking-quote-${option.type}`} className="text-xs text-slate-600">
        Échéance dès le 1<sup>er</sup> jour : <strong>{euro2(priced.firstDayPayment)}</strong> · intérêts au total : <strong>{euro(priced.totalInterest)}</strong> · frais de dossier : {euro(priced.originationFee)}
      </p>
      {option.reason && (
        <p data-testid={`banking-reason-${option.type}`} className="text-xs text-rose-700">
          {option.reason}
        </p>
      )}
    </li>
  );
}

// The bank's desk (see lib/banking/bankingLoanEngine.js): the hotel's financial
// health (credit score, debt, what it may still borrow, solvency), the loans on
// offer and the ones running. `onTake(typeId, amount)` takes a loan and
// `onRepay(loanId)` repays one early -- Dashboard.jsx and the /finance/banking
// page wire them through applyHotelAdjustment(). Shared by BankingModal and the
// page.
export default function BankingPanel({ hotelState, onTake, onRepay }) {
  const bank = describeBanking(hotelState);

  return (
    <div data-testid="banking-panel" className="flex flex-col gap-4">
      {bank.overdrawn && (
        <p role="alert" data-testid="banking-overdraft" className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
          Compte à découvert de {euro(-bank.balance)} : des agios et des frais sont prélevés chaque jour tant qu'il n'est pas renfloué.
        </p>
      )}

      {bank.lastOutcome && (
        <p data-testid="banking-outcome" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {bank.lastOutcome.text}
        </p>
      )}

      <BentoCard as="div" tone={bank.rating.tone} title="Santé financière" icon="🏦">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-800">Score de crédit</span>
              <span className="flex items-center gap-2">
                <strong data-testid="banking-score">{bank.score}/100</strong>
                <StatusBadge tone={bank.rating.tone} data-testid="banking-rating">{bank.rating.label}</StatusBadge>
              </span>
            </div>
            <div role="meter" aria-label="Score de crédit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bank.score} data-testid="banking-score-meter" className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[var(--tone)] transition-all" data-tone={bank.rating.tone} style={{ width: `${bank.score}%` }} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div data-testid="banking-balance" data-tone={bank.overdrawn ? "danger" : "success"} className="rounded-2xl bg-[var(--tone-soft)] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Compte</dt>
              <dd className="text-base font-bold text-slate-900">{euro(bank.balance)}</dd>
            </div>
            <div data-testid="banking-debt" data-tone="vip" className="rounded-2xl bg-[var(--tone-soft)] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dette</dt>
              <dd className="text-base font-bold text-slate-900">{euro(bank.debt)}</dd>
            </div>
            <div data-testid="banking-capacity" data-tone="action" className="rounded-2xl bg-[var(--tone-soft)] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Capacité d'emprunt</dt>
              <dd className="text-base font-bold text-slate-900">{euro(bank.capacity)}</dd>
              <dd className="text-[11px] text-slate-500">sur {euro(bank.ceiling)}</dd>
            </div>
            <div data-testid="banking-solvency" data-tone="mice" className="rounded-2xl bg-[var(--tone-soft)] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Solvabilité</dt>
              <dd className="text-base font-bold text-slate-900">{bank.solvency === null ? "—" : `${bank.solvency.toLocaleString("fr-FR")}×`}</dd>
              <dd className="text-[11px] text-slate-500">{bank.solvency === null ? "aucune dette" : "fonds propres / dette"}</dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">
            Hôtel {bank.stars}★ · {bank.repaidLoans} crédit{bank.repaidLoans > 1 ? "s" : ""} remboursé{bank.repaidLoans > 1 ? "s" : ""} · {bank.overdraftDays} jour{bank.overdraftDays > 1 ? "s" : ""} à découvert · {bank.missedPayments} échéance{bank.missedPayments > 1 ? "s" : ""} manquée{bank.missedPayments > 1 ? "s" : ""}
          </p>
        </div>
      </BentoCard>

      {bank.loans.length > 0 && (
        <section aria-label="Crédits en cours" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Crédits en cours</h3>
            <StatusBadge tone="vip" data-testid="banking-due">{euro(bank.dailyDue)} à payer chaque jour</StatusBadge>
          </div>
          <ul className="flex flex-col gap-2">
            {bank.loans.map((loan) => (
              <li key={loan.id} data-testid={`banking-loan-${loan.id}`} className="flex flex-col gap-2 rounded-2xl border border-[var(--ds-border)] bg-white p-3 shadow-[var(--ds-shadow-card)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    <span aria-hidden="true">{loan.icon}</span> {loan.label}
                  </p>
                  <span className="text-xs text-slate-600">
                    reste <strong data-testid={`banking-balance-${loan.id}`}>{euro(loan.balance)}</strong> · {loan.daysLeft} jour{loan.daysLeft > 1 ? "s" : ""}
                  </span>
                </div>
                <div role="meter" aria-label={`Remboursement : ${loan.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={loan.progressPercent} data-testid={`banking-progress-${loan.id}`} className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[var(--ds-success)]" style={{ width: `${loan.progressPercent}%` }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">
                    Échéance du jour : <strong>{euro2(loan.dailyPayment)}</strong> · {loan.progressPercent} % remboursé
                  </span>
                  <SoftButton
                    tone="neutral"
                    data-testid={`banking-repay-${loan.id}`}
                    disabled={bank.treasury < loan.repay.total}
                    onClick={() => onRepay?.(loan.id)}
                    className="!px-3 !py-1 !text-xs"
                  >
                    Rembourser · {euro(loan.repay.total)}
                  </SoftButton>
                </div>
                {bank.treasury < loan.repay.total && (
                  <p data-testid={`banking-repay-reason-${loan.id}`} className="text-xs text-rose-700">
                    Trésorerie insuffisante pour un remboursement anticipé (frais de 1 % compris).
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Offres de crédit" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Emprunter</h3>
        <ul className="flex flex-col gap-2">
          {LOAN_TYPE_IDS.map((id) => (
            <OfferCard key={id} option={bank.options.find((item) => item.type === id)} onTake={onTake} />
          ))}
        </ul>
      </section>

      <p data-testid="banking-ledger" className="text-xs text-slate-500">
        Depuis l'ouverture : {euro(bank.ledger.principalPaid)} de capital remboursé, {euro(bank.ledger.interest)} d'intérêts, {euro(bank.ledger.fees)} de frais.
      </p>
    </div>
  );
}
