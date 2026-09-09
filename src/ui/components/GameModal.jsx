import { useEffect } from "react";
import { fadeIn } from "../animations";

// A simple animated modal: backdrop fade-in, centered panel, closes on
// Escape or backdrop click. Renders nothing when `open` is false (no
// portal -- every page in this app already renders inside <Layout>'s
// single root, so a plain fixed-position overlay is enough).
export default function GameModal({ open, onClose, title, children, className = "" }) {
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
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-4 ${fadeIn}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className={`w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ${className}`}>
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
