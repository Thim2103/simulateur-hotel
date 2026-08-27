export default function KpiCard({ label, value, trend }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md flex flex-col gap-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {trend && (
        <span
          className={`text-sm ${
            trend > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend > 0 ? `+${trend}%` : `${trend}%`}
        </span>
      )}
    </div>
  );
}
