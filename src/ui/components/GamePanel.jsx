import { fadeIn } from "../animations";

// A contextual panel -- a slightly heavier surface than GameCard, used for
// grouped content that reads as one "unit" (e.g. a hub's sub-module list,
// a day's KPI panel). Fades in on mount by default.
export default function GamePanel({ title, actions, children, animate = true, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${animate ? fadeIn : ""} ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
