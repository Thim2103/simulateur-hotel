// A modern tab strip -- role="tablist"/"tab" (same accessible contract as
// the ad hoc tab patterns already used e.g. in TfeForecast.jsx/
// ProForecast.jsx), pill-style active state instead of an underline.
export default function GameTabs({ tabs, activeId, onChange, className = "" }) {
  return (
    <div role="tablist" className={`inline-flex gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 ${className}`}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
