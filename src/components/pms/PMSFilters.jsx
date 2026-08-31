export default function PMSFilters({ filters, setFilters }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow flex gap-4">

      <div className="flex flex-col">
        <label className="text-sm">Type de chambre</label>
        <select
          value={filters.roomType}
          onChange={(e) =>
            setFilters({ ...filters, roomType: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Toutes</option>
          <option value="standard">Standard</option>
          <option value="deluxe">Deluxe</option>
          <option value="suite">Suite</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm">Statut</label>
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Tous</option>
          <option value="confirmée">Confirmée</option>
          <option value="annulée">Annulée</option>
          <option value="option">Option</option>
        </select>
      </div>
    </div>
  );
}
