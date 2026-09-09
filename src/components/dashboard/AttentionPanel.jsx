import { Link } from "react-router-dom";
import GamePanel from "../../ui/components/GamePanel";
import GameBadge from "../../ui/components/GameBadge";
import { slideUp, delay } from "../../ui/animations";

const SEVERITY_STYLE = {
  high: "border-rose-200 bg-rose-50",
  medium: "border-amber-200 bg-amber-50",
  low: "border-emerald-200 bg-emerald-50",
};
const SEVERITY_DOT = { high: "🔴", medium: "🟠", low: "🟡" };

// "Ce qui demande votre attention aujourd'hui" -- 3 to 5 problems/
// opportunities (see lib/dashboard/attentionItems.js), each with a
// severity glyph and an [Analyser] link straight into the module that can
// address it. Each row animates in with a small stagger.
export default function AttentionPanel({ items }) {
  return (
    <GamePanel title="Ce qui demande votre attention aujourd'hui">
      {!items || items.length === 0 ? (
        <p className="text-sm text-slate-500">Rien à signaler pour l'instant : votre hôtel tourne bien.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              style={delay(index)}
              className={`flex flex-col gap-2 rounded-lg border p-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between ${slideUp} ${
                SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.medium
              }`}
            >
              <div className="flex items-start gap-2">
                <span aria-hidden="true" className="text-sm leading-5">{SEVERITY_DOT[item.severity] || SEVERITY_DOT.medium}</span>
                <div>
                  <GameBadge tone={item.severity}>{item.bucketLabel}</GameBadge>
                  <p className="mt-1 text-sm text-slate-800">{item.message}</p>
                </div>
              </div>
              <Link
                to={item.moduleLink}
                className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-900 hover:text-white"
              >
                Analyser · {item.moduleLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GamePanel>
  );
}
