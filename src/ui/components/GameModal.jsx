import { useEffect } from "react";
import { fadeIn } from "../animations";

// A simple animated modal: backdrop fade-in, centered panel, closes on
// Escape or backdrop click. Renders nothing when `open` is false (no
// portal -- every page in this app already renders inside <Layout>'s
// single root, so a plain fixed-position overlay is enough).
export default function GameModal({ open, onClose, title, children, className = "", tone }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px] ${fadeIn}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div data-tone={tone || undefined} className={`w-full max-w-md rounded-3xl border border-[var(--ds-border)] bg-white p-5 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] ${tone ? "border-t-4 border-t-[var(--tone)]" : ""} ${className}`}>
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
