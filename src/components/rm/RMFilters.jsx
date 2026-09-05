import Card from "../ui/Card";

export default function RMFilters({ filters, setFilters }) {
  const updateFilter = (key) => (event) => {
    setFilters({ ...filters, [key]: event.target.value });
  };

  return (
    <Card title="Filtres RM" description="Affinez la lecture des indicateurs et des prévisions.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Date début
          <input type="date" value={filters.startDate} onChange={updateFilter("startDate")} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Date fin
          <input type="date" value={filters.endDate} onChange={updateFilter("endDate")} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Type de chambre
          <select value={filters.roomType} onChange={updateFilter("roomType")} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100">
            <option value="">Toutes</option>
            <option value="standard">Standard</option>
            <option value="deluxe">Deluxe</option>
            <option value="suite">Suite</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Segment
          <select value={filters.segment} onChange={updateFilter("segment")} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100">
            <option value="">Tous</option>
            <option value="loisir">Loisir</option>
            <option value="business">Business</option>
            <option value="groupes">Groupes</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Canal
          <select value={filters.channel} onChange={updateFilter("channel")} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100">
            <option value="">Tous</option>
            <option value="direct">Direct</option>
            <option value="ota">OTA</option>
            <option value="corporate">Corporate</option>
            <option value="agency">Agence</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700 sm:col-span-2 xl:col-span-1">
          Statut
          <select value={filters.status} onChange={updateFilter("status")} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100">
            <option value="">Tous</option>
            <option value="confirmée">Confirmée</option>
            <option value="annulée">Annulée</option>
          </select>
        </label>
      </div>
    </Card>
  );
}
