import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useDailyReview } from "../hooks/useDailyReview";

// "DailyReview" -- the last step of the daily loop (Morning -> MyHotel ->
// Decisions -> Day -> Results), reached from Dashboard.jsx's "Jouer la
// journée" button. Route: /daily-review. See hooks/useDailyReview.js/
// lib/dashboard/dailyReview.js.
export default function DailyReview() {
  const { review, isRunning, error, loadReview } = useDailyReview();

  useEffect(() => {
    loadReview().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!review) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Résultats</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Aucune journée jouée pour l'instant</h1>
            <p className="mt-1 text-sm text-slate-500">Jouez une journée depuis votre hôtel pour voir ce qui s'est passé.</p>
          </div>
        </header>
        <Link to="/dashboard">
          <Button>Aller à l'hôtel</Button>
        </Link>
      </div>
    );
  }

  const { summary } = review;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Résultats</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Que s'est-il passé ? — Jour {review.day}</h1>
          {review.date && <p className="mt-1 text-sm text-slate-500">{review.date}</p>}
        </div>
        <Link to="/dashboard">
          <Button disabled={isRunning}>Retour à l'hôtel</Button>
        </Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <section aria-labelledby="review-summary" className="flex flex-col gap-2">
        <h2 id="review-summary" className="text-base font-semibold text-slate-900">Résumé</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><p className="text-xs text-slate-500">Revenu</p><p className="mt-1 text-lg font-semibold text-slate-900">{summary.revenue.toLocaleString()} €</p></Card>
          <Card><p className="text-xs text-slate-500">Profit</p><p className={`mt-1 text-lg font-semibold ${summary.profit >= 0 ? "text-slate-900" : "text-rose-700"}`}>{summary.profit.toLocaleString()} €</p></Card>
          <Card><p className="text-xs text-slate-500">Satisfaction</p><p className="mt-1 text-lg font-semibold text-slate-900">{summary.satisfaction === null ? "—" : `${summary.satisfaction.toFixed(1)}/5`}</p></Card>
          <Card><p className="text-xs text-slate-500">Moral du personnel</p><p className="mt-1 text-lg font-semibold text-slate-900">{summary.staffMorale === null || summary.staffMorale === undefined ? "—" : `${summary.staffMorale}/100`}</p></Card>
        </div>
      </section>

      <section aria-labelledby="review-why" className="flex flex-col gap-2">
        <h2 id="review-why" className="text-base font-semibold text-slate-900">Pourquoi ?</h2>
        <Card>
          {review.causalChain.length === 0 ? (
            <p className="text-sm text-slate-500">Rien de notable à expliquer aujourd'hui.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm text-slate-700">
              {review.causalChain.map((line, index) => (
                <li key={index}>→ {line}</li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {review.attentionItems.length > 0 && (
        <section aria-labelledby="review-more" className="flex flex-col gap-2">
          <h2 id="review-more" className="text-base font-semibold text-slate-900">En savoir plus</h2>
          <Card>
            <ul className="flex flex-col gap-2">
              {review.attentionItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2 text-sm">
                  <span>{item.message}</span>
                  <Link to={item.moduleLink} className="shrink-0 text-xs font-semibold text-cyan-700 hover:underline">
                    {item.moduleLabel} →
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
