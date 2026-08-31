export default function RMFilters({ filters, setFilters }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow flex flex-col gap-4">

      <h3 className="text-lg font-semibold">Filtres RM</h3>

      {/* Filtre date */}
      <div className="flex gap-4">
        <div className="flex flex-col">
          <label className="text-sm">Date début</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            className="border p-2 rounded"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm">Date fin</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            className="border p-2 rounded"
          />
        </div>
      </div>

      {/* Filtre type de chambre */}
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

      {/* Filtre segment */}
      <div className="flex flex-col">
        <label className="text-sm">Segment</label>
        <select
          value={filters.segment}
          onChange={(e) =>
            setFilters({ ...filters, segment: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Tous</option>
          <option value="loisir">Loisir</option>
          <option value="business">Business</option>
          <option value="groupes">Groupes</option>
        </select>
      </div>

      {/* Filtre canal */}
      <div className="flex flex-col">
        <label className="text-sm">Canal</label>
        <select
          value={filters.channel}
          onChange={(e) =>
            setFilters({ ...filters, channel: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Tous</option>
          <option value="direct">Direct</option>
          <option value="ota">OTA</option>
          <option value="corporate">Corporate</option>
          <option value="agency">Agence</option>
        </select>
      </div>

      {/* Filtre status */}
      <div className="flex flex-col">
        <label className="text-sm">Status</label>
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
        </select>
      </div>
    </div>
  );
}
