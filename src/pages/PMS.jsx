import { useEffect, useState } from "react";
import { getRooms, getReservations } from "../lib/calculs/rm"; 
import PMSGrid from "../components/pms/PMSGrid";
import PMSFilters from "../components/pms/PMSFilters";
import PMSLegend from "../components/pms/PMSLegend";

export default function PMS() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    roomType: "",
    status: "",
  });

  useEffect(() => {
    async function load() {
      const r = await getRooms();
      const res = await getReservations();

      setRooms(r);
      setReservations(res);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <div className="p-6">Chargement du planning…</div>;

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Planning PMS</h1>

      <PMSFilters filters={filters} setFilters={setFilters} />

      <PMSLegend />

      <PMSGrid rooms={rooms} reservations={reservations} filters={filters} />
    </div>
  );
}
