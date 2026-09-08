import { Link } from "react-router-dom";

export default function Credits() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-white">
      <h1 className="text-2xl font-bold tracking-tight">Crédits</h1>
      <p className="max-w-md text-sm text-slate-300">
        Hospitality Lab — un simulateur de gestion hôtelière et de restauration : Mode Carrière, Academy, Compétition,
        Replay et Analytics Engine, Revenue Management, PMS, et bien plus.
      </p>
      <Link to="/menu" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300">← Retour au menu</Link>
    </div>
  );
}
