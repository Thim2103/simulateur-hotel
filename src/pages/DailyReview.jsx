import { useEffect } from "react";
import { Link } from "react-router-dom";
import GameButton from "../ui/components/GameButton";
import GameCard from "../ui/components/GameCard";
import GameSection from "../ui/components/GameSection";
import { useDailyReview } from "../hooks/useDailyReview";
import { useGmDesk } from "../ui/gmDesk/GmDeskProvider";
import { messageTypeMeta } from "../ui/gmDesk/GmMessageTypes";
import { fadeIn, slideUp, delay } from "../ui/animations";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function StatTile({ label, icon, value, tone = "default", index = 0 }) {
  return (
    <GameCard className={slideUp}>
      <div style={delay(index)} className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">{icon}</span>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className={`mt-1 text-lg font-semibold ${tone === "danger" ? "text-rose-700" : "text-slate-900"}`}>{value}</p>
    </GameCard>
  );
}

// A small, dependency-free "stylised graph": a horizontal bar whose fill
// width reflects revenue vs. profit, so the summary reads visually rather
// than as bare numbers alone -- no chart library needed for two bars.
function RevenueProfitBar({ revenue, profit }) {
  const max = Math.max(Math.abs(revenue), Math.abs(profit), 1);
  const revenueWidth = Math.round((Math.abs(revenue) / max) * 100);
  const profitWidth = Math.round((Math.abs(profit) / max) * 100);
  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-16 shrink-0">Revenu</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#0b1730] transition-all duration-500" style={{ width: `${revenueWidth}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-16 shrink-0">Profit</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all duration-500 ${profit >= 0 ? "bg-[#e9ab1f]" : "bg-rose-500"}`} style={{ width: `${profitWidth}%` }} />
        </div>
      </div>
    </div>
  );
}

// "DailyReview" -- the last step of the daily loop (Morning -> MyHotel ->
// Decisions -> Day -> Results), reached from Dashboard.jsx's "Jouer la
// journée" button. Route: /daily-review. See hooks/useDailyReview.js/
// lib/dashboard/dailyReview.js. Restyled with the game design system --
// every heading/label/link text is unchanged from before.
export default function DailyReview() {
  const { review, isRunning, error, loadReview } = useDailyReview();
  const { messages: gmMessages } = useGmDesk();

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
          <GameButton icon="🏨">Aller à l'hôtel</GameButton>
        </Link>
      </div>
    );
  }

  const { summary } = review;

  return (
    <div className="flex flex-col gap-6">
      <header className={`page-header ${slideUp}`}>
        <div>
          <p className="eyebrow">🌙 Résultats</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Que s'est-il passé ? — Jour {review.day}</h1>
          {review.date && <p className="mt-1 text-sm text-slate-500">{review.date}</p>}
        </div>
        <Link to="/dashboard">
          <GameButton disabled={isRunning}>Retour à l'hôtel</GameButton>
        </Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <GameSection id="review-summary" title="Résumé" icon="📊" className={fadeIn}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Revenu" icon="💵" value={`${summary.revenue.toLocaleString()} €`} index={0} />
          <StatTile label="Profit" icon="💰" tone={summary.profit >= 0 ? "default" : "danger"} value={`${summary.profit.toLocaleString()} €`} index={1} />
          <StatTile label="Satisfaction" icon="⭐" value={summary.satisfaction === null ? "—" : `${summary.satisfaction.toFixed(1)}/5`} index={2} />
          <StatTile label="Moral du personnel" icon="👔" value={summary.staffMorale === null || summary.staffMorale === undefined ? "—" : `${summary.staffMorale}/100`} index={3} />
        </div>
        <RevenueProfitBar revenue={summary.revenue} profit={summary.profit} />
      </GameSection>

      <GameSection id="review-why" title="Pourquoi ?" icon="🧭">
        <GameCard>
          {review.causalChain.length === 0 ? (
            <p className="text-sm text-slate-500">Rien de notable à expliquer aujourd'hui.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm text-slate-700">
              {review.causalChain.map((line, index) => (
                <li key={index} style={delay(index)} className={`flex items-start gap-2 ${slideUp}`}>
                  <span aria-hidden="true" className="mt-0.5 text-[#e9ab1f]">→</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </GameCard>
      </GameSection>

      <GameSection id="review-messages" title="Messages reçus aujourd'hui" icon="📬">
        <GameCard>
          {gmMessages.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun message au GM Desk pour l'instant.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {gmMessages
                  .slice()
                  .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3))
                  .slice(0, 5)
                  .map((message) => (
                    <li key={message.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                      <span aria-hidden="true">{messageTypeMeta(message.type).icon}</span>
                      <span className="flex-1 truncate">{message.title}</span>
                    </li>
                  ))}
              </ul>
              <Link to="/gm-desk" className="mt-3 inline-block text-xs font-semibold text-cyan-700 hover:underline">
                Voir tous les messages au GM Desk →
              </Link>
            </>
          )}
        </GameCard>
      </GameSection>

      {review.attentionItems.length > 0 && (
        <GameSection id="review-more" title="En savoir plus" icon="🔎">
          <GameCard>
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
          </GameCard>
        </GameSection>
      )}
    </div>
  );
}
