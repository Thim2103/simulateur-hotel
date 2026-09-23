import { Link } from "react-router-dom";
import Card from "../ui/Card";

const STAR_STYLE = { 1: "★☆☆☆☆", 2: "★★☆☆☆", 3: "★★★☆☆", 4: "★★★★☆", 5: "★★★★★" };

// The "Journal" space (Étape 2/4 of the "board game numérique" redesign):
// what happened tonight and why, in plain language. Three things, per
// Étape 4's own spec: the simplified financial result, today's most
// telling guest review with its "Pourquoi cette note ?" breakdown (see
// lib/journal/guestReviewsEngine.js), and that review's real impact on
// the hotel's reputation -- plus the cause-to-effect chains
// (lib/journal/causalityEngine.js) and the existing line-by-line causal
// chain (lib/dashboard/dailyReview.js) for everything else that
// happened. No new engine state -- purely a reading of what already
// exists, same as Étape 2's original version of this panel.
export default function JournalPanel({ causalChain = [], reviewsToAnswer = 0, gmMessageCount = 0, financialSummary = null, causalLinks = [], featuredReview = null, featuredExplanation = null }) {
  const charges = financialSummary && financialSummary.revenue !== null && financialSummary.profit !== null ? financialSummary.revenue - financialSummary.profit : null;

  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-slate-900">📖 Journal</h2>

      {financialSummary && financialSummary.revenue !== null && (
        <div data-testid="journal-financial-summary" className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Recettes <strong>{financialSummary.revenue.toLocaleString("fr-FR")} €</strong> − Charges{" "}
          <strong>{(charges ?? 0).toLocaleString("fr-FR")} €</strong> = Résultat{" "}
          <strong className={financialSummary.profit >= 0 ? "text-emerald-700" : "text-rose-700"}>{financialSummary.profit.toLocaleString("fr-FR")} €</strong>
        </div>
      )}

      {featuredReview && (
        <div data-testid="journal-featured-review" className="mb-4 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-amber-500" aria-label={`${featuredReview.rating} étoiles`}>{STAR_STYLE[featuredReview.rating] || STAR_STYLE[3]}</span>
            <span className="text-xs font-medium text-slate-500">
              Impact réputation : {featuredReview.impact >= 0 ? "+" : ""}{featuredReview.impact} pt{Math.abs(featuredReview.impact) > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-1 text-sm italic text-slate-700">« {featuredReview.text} »</p>
          {featuredExplanation && (
            <div className="mt-2 text-xs text-slate-600">
              <p className="font-semibold uppercase tracking-wide text-slate-400">Pourquoi cette note ?</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {featuredExplanation.positives.map((line, index) => <li key={`p-${index}`} className="text-emerald-700">+ {line}</li>)}
                {featuredExplanation.negatives.map((line, index) => <li key={`n-${index}`} className="text-rose-700">− {line}</li>)}
              </ul>
              {featuredExplanation.businessConcept && (
                <p className="mt-1 italic text-slate-400">Concept lié : {featuredExplanation.businessConcept}</p>
              )}
            </div>
          )}
        </div>
      )}

      {causalLinks.length > 0 && (
        <ul data-testid="journal-causal-links" className="mb-4 flex flex-col gap-2">
          {causalLinks.map((link) => (
            <li key={link.id} className="rounded-lg border border-amber-100 bg-amber-50/60 p-2 text-sm text-slate-700">
              {link.chain.join(" → ")}
              {link.businessConcept && <span className="ml-1 text-xs italic text-slate-400">({link.businessConcept})</span>}
            </li>
          ))}
        </ul>
      )}

      {causalChain.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm text-slate-700">
          {causalChain.map((line, index) => (
            <li key={index} className="rounded-lg border border-slate-200 p-2">{line}</li>
          ))}
        </ul>
      ) : (
        !financialSummary && !featuredReview && causalLinks.length === 0 && <p className="text-sm text-slate-500">Aucun événement notable pour l'instant.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link to="/clients/reviews" className="font-medium text-cyan-700 hover:underline">
          Avis clients {reviewsToAnswer > 0 ? `(${reviewsToAnswer} en attente)` : ""} →
        </Link>
        <Link to="/gm-desk" className="font-medium text-cyan-700 hover:underline">
          GM Desk {gmMessageCount > 0 ? `(${gmMessageCount})` : ""} →
        </Link>
      </div>
    </Card>
  );
}
