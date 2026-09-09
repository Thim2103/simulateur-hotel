const TONES = {
  high: "border-rose-200 bg-rose-50 text-rose-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  gold: "border-amber-300 bg-amber-100 text-amber-900",
};

// A small status pill -- severity (high/medium/low, same vocabulary as
// every diagnostics generator in the app), neutral, or gold (achievement/
// highlight). Used by AttentionPanel, GameNotification and anywhere else a
// short status label is shown next to a title.
export default function GameBadge({ children, tone = "neutral", className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TONES[tone] || TONES.neutral} ${className}`}>
      {children}
    </span>
  );
}
