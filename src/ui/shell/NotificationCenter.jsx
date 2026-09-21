import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../bento/StatusBadge";

// The bell in the status bar: a red pill with the number of things waiting
// (breakdowns, V.I.P.s to welcome, bad reviews, seminar quotes, GM Desk
// messages -- see lib/dashboard/statusSummary.js's urgentItems()), and a small
// panel listing them, each a link to where it can be dealt with.
export default function NotificationCenter({ items = [] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const urgent = items.some((item) => item.priority);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    const onPointer = (event) => rootRef.current && !rootRef.current.contains(event.target) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="notification-bell"
        data-count={total}
        data-priority={urgent ? "true" : undefined}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={total > 0 ? `Notifications, ${total} en attente` : "Notifications, rien en attente"}
        onClick={() => setOpen((value) => !value)}
        className={`relative grid h-10 w-10 place-items-center rounded-xl text-lg transition-colors ${urgent ? "crisis-blink bg-rose-50 hover:bg-rose-100" : "bg-slate-50 hover:bg-slate-100"}`}
      >
        <span aria-hidden="true">🔔</span>
        {total > 0 && (
          <span data-testid="notification-pill" className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div role="region" aria-label="Notifications urgentes" className="absolute right-0 top-12 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.25)]">
          {items.length === 0 ? (
            <p className="p-2 text-sm text-slate-500">Rien d'urgent : votre hôtel tourne bien.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li key={item.id}>
                  <Link to={item.to} onClick={() => setOpen(false)} data-testid={`notification-${item.id}`} data-priority={item.priority ? "true" : undefined} className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${item.priority ? "border border-rose-300 bg-rose-50 font-semibold hover:bg-rose-100" : "hover:bg-slate-50"}`}>
                    <StatusBadge tone={item.tone} icon={item.icon}>{item.count}</StatusBadge>
                    <span className="text-sm text-slate-800">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
