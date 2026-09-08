import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useGuest } from "../hooks/useGuest";

// Lets a new player start the Solo/Career mode immediately, with no
// Supabase account and no wait for anonymous auth: createGuestSession()
// stores a local guest identity (see lib/guest/guestSession.js), then
// every hook that data belongs to (useCareer, useRestaurant, ...) already
// checks useSupabaseSession()'s `isGuest` and reads/writes localStorage
// instead of Supabase from that point on.
export default function GuestMode() {
  const { guestSession, createGuestSession, resetGuestSession } = useGuest();
  const navigate = useNavigate();

  const handlePlayAsGuest = () => {
    createGuestSession();
    navigate("/select-mode");
  };

  // "Se déconnecter" du mode invité : retour au Menu Principal, session
  // locale réinitialisée (see lib/guest/guestSession.js's
  // resetGuestSession()) -- la prochaine visite de /play ou /guest
  // repartira d'une session invité neuve, pas de l'ancienne.
  const handleQuitGuestMode = () => {
    resetGuestSession();
    navigate("/menu");
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Invité</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Jouer sans compte</h1>
          <p className="mt-1 text-sm text-slate-500">
            Démarrez le Mode Carrière tout de suite : aucune inscription, aucune connexion à Supabase requise.
          </p>
        </div>
      </header>

      <Card title="Ce qui change en mode invité">
        <ul className="flex flex-col gap-2 text-sm text-slate-700">
          <li>• Votre hôtel et votre progression sont enregistrés uniquement dans ce navigateur (localStorage).</li>
          <li>• Vous démarrez avec un établissement déjà prêt à jouer : chambres, équipe et réservations sont préremplies.</li>
          <li>• Rejouer vos journées (Replay) et voir vos statistiques (Analytics) fonctionnent normalement, en local.</li>
          <li>• Videz les données de ce site pour tout réinitialiser ; il n'y a rien à récupérer sur un autre appareil.</li>
        </ul>
      </Card>

      <Card className="border-cyan-100 bg-gradient-to-br from-white to-cyan-50/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-600">
              {guestSession ? "Une session invité existe déjà sur ce navigateur." : "Aucune session invité pour le moment."}
            </p>
          </div>
          <div className="flex gap-2">
            {guestSession && (
              <Button variant="outline" onClick={handleQuitGuestMode}>
                Quitter le mode invité
              </Button>
            )}
            <Button onClick={handlePlayAsGuest}>Jouer en mode invité</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
