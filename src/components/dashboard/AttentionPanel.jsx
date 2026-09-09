import { Link } from "react-router-dom";
import Card from "../ui/Card";

const SEVERITY_STYLE = {
  high: "border-rose-200 bg-rose-50 text-rose-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

// "Ce qui demande votre attention aujourd'hui" -- 3 to 5 problems/
// opportunities (see lib/dashboard/attentionItems.js), each with an
// [Analyser] link straight into the module that can address it.
export default function AttentionPanel({ items }) {
  return (
    <section aria-labelledby="attention-panel-title" className="flex flex-col gap-3">
      <h2 id="attention-panel-title" className="text-base font-semibold text-slate-900">Ce qui demande votre attention aujourd'hui</h2>
      <Card>
        {!items || items.length === 0 ? (
          <p className="text-sm text-slate-500">Rien à signaler pour l'instant : votre hôtel tourne bien.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.medium}`}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide">{item.bucketLabel}</p>
                  <p className="text-sm">{item.message}</p>
                </div>
                <Link to={item.moduleLink} className="shrink-0 rounded-md border border-current px-3 py-1.5 text-xs font-semibold hover:bg-white/60">
                  Analyser · {item.moduleLabel}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
