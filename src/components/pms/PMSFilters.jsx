import Card from "../ui/Card";

export default function PMSFilters({ filters, setFilters }) {
  return (
    <Card title="Filtres du planning">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-slate-700">Type de chambre</label>
        <select
          value={filters.roomType}
          onChange={(e) =>
            setFilters({ ...filters, roomType: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100"
        >
          <option value="">Toutes</option>
          <option value="standard">Standard</option>
          <option value="deluxe">Deluxe</option>
          <option value="suite">Suite</option>
          <option value="seminar">Seminar</option>
          <option value="conference">Conference</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-slate-700">Statut</label>
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100"
        >
          <option value="">Tous</option>
          <option value="confirmée">Confirmée</option>
          <option value="annulée">Annulée</option>
          <option value="option">Option</option>
        </select>
      </div>
      </div>
    </Card>
  );
}
