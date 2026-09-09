import { useEffect } from "react";
import { slideLeft } from "../animations";

const TONES = {
  info: "border-slate-200 bg-white text-slate-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

// A single toast, positioned fixed bottom-right, sliding in from the
// right. Auto-dismisses after `duration` ms (default 4s) unless the
// caller passes `duration: null`. Stateless: the caller owns the "is this
// notification shown" state and passes `onDismiss`.
export default function GameNotification({ message, tone = "info", duration = 4000, onDismiss }) {
  useEffect(() => {
    if (duration === null || !onDismiss) return undefined;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      role="status"
      className={`fixed bottom-4 right-4 z-[10000] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${TONES[tone] || TONES.info} ${slideLeft}`}
    >
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Fermer la notification" className="text-current opacity-60 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  );
}
