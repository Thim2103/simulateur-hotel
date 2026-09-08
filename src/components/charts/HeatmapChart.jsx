import Card from "../ui/Card";

// A lightweight heatmap for the Staff module's surcharge (overload) --
// StaffDashboard.jsx's "surcharge (heatmap)" chart (see the Refonte RH
// request's section 4). No charting library needed: a grid of colored
// cells is enough for a handful of categories/days, and keeps this in
// line with the rest of components/charts/ (LineChart.jsx/BarChart.jsx/
// AreaChart.jsx) without adding a new dependency.
function intensityColor(value) {
  if (value >= 130) return "bg-rose-600";
  if (value >= 110) return "bg-rose-400";
  if (value >= 90) return "bg-amber-400";
  if (value >= 70) return "bg-amber-200";
  return "bg-emerald-300";
}

// rows: [{ label, cells: [{ label, value }] }]
export default function HeatmapChart({ title, rows }) {
  return (
    <Card title={title}>
      <div className="flex flex-col gap-2">
        {(rows || []).map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-xs font-medium text-slate-600">{row.label}</span>
            <div className="flex flex-1 gap-1">
              {row.cells.map((cell) => (
                <div
                  key={cell.label}
                  title={`${cell.label} : ${cell.value}%`}
                  className={`flex h-8 flex-1 items-center justify-center rounded text-[10px] font-semibold text-slate-900/70 ${intensityColor(cell.value)}`}
                >
                  {cell.value}%
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
