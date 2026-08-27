import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white h-screen p-4 flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Simulateur Hôtel</h2>

      <nav className="flex flex-col gap-4">
        <Link to="/" className="hover:text-blue-400">Dashboard</Link>
        <Link to="/reservations" className="hover:text-blue-400">Réservations</Link>
        <Link to="/rooms" className="hover:text-blue-400">Chambres</Link>
        <Link to="/clients" className="hover:text-blue-400">Clients</Link>
        <Link to="/finance" className="hover:text-blue-400">Finance</Link>
        <Link to="/housekeeping" className="hover:text-blue-400">Housekeeping</Link>
      </nav>
    </div>
  );
}
