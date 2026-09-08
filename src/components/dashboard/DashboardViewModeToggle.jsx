const OPTIONS = [
  { value: "casual", label: "Casual" },
  { value: "expert", label: "Expert" },
];

// Casual/expert switch -- only changes how a couple of KPI labels/values
// read (see lib/dashboard/dashboardViewMode.js), never what's computed.
export default function DashboardViewModeToggle({ viewMode, onChange }) {
  return (
    <div role="group" aria-label="Mode d'affichage" className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={viewMode === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors duration-150 ${
            viewMode === option.value ? "bg-cyan-700 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
