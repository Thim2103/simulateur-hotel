export default function Input({ label, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
      <input
        className={`rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-shadow placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100 ${className}`}
        {...props}
      />
    </div>
  );
}
