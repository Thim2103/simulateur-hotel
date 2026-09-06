export default function Table({ columns, children, loading = false, empty = false, error = "", emptyMessage = "Aucune donnée disponible." }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col, i) => (
                <th key={i} scope="col" className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2" role="status">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-700" />
                    Chargement des données…
                  </span>
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-rose-600">{error}</td>
              </tr>
            )}
            {!loading && !error && empty && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-500">{emptyMessage}</td>
              </tr>
            )}
            {!loading && !error && !empty && children}
          </tbody>
        </table>
      </div>
    </div>
  );
}
