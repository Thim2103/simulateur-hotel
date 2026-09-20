import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import MicePanel from "../components/mice/MicePanel";
import { useCareerContext } from "../context/CareerContext";
import { careerReferenceDate } from "../lib/career/careerEngine";
import { respondToRequest } from "../lib/mice/miceEngine";

// Route: /corporate/events -- séminaires et événements professionnels (MICE,
// see lib/mice/miceEngine.js): the quotes waiting for an answer, the events
// already signed, the meeting rooms' calendar and the revenue guaranteed.
export default function CorporateEvents() {
  const { careerState, error, applyHotelAdjustment } = useCareerContext();

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Clientèle d'affaires</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Événements pro</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour recevoir des demandes de séminaires.</p>
          </div>
        </header>
        <Card><Link to="/dashboard"><Button>← Retour au tableau de bord</Button></Link></Card>
      </div>
    );
  }

  const hotel = careerState.hotel || {};
  const handleRespond = (requestId, action) => {
    Promise.resolve(applyHotelAdjustment?.((bundle) => respondToRequest(bundle, requestId, action, { day: careerState.day, date: careerReferenceDate(careerState) }))).catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Clientèle d'affaires</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Événements pro</h1>
          <p className="mt-1 text-sm text-slate-500">Séminaires, conférences et incentives (MICE) — jour {careerState.day}.</p>
        </div>
        <Link to="/dashboard"><Button variant="outline">← Tableau de bord</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <Card>
        <MicePanel hotelState={hotel.hotelState} rooms={hotel.rooms} reservations={hotel.reservations} date={careerReferenceDate(careerState)} onRespond={handleRespond} />
      </Card>
    </div>
  );
}
