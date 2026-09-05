export default function KpiCard({ label, value, trend }) {
  return (
    <div className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-2 block text-2xl font-bold tracking-tight text-slate-900">{value}</span>
      {trend && (
        <span
          className={`text-sm ${
            trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {trend > 0 ? `+${trend}%` : `${trend}%`} <span className="text-slate-400">vs période précédente</span>
        </span>
      )}
    </div>
  );
}
