import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoyaltyPanel from "../components/loyalty/LoyaltyPanel";
import { useCareerContext } from "../context/CareerContext";
import { careerReferenceDate } from "../lib/career/careerEngine";
import { launchProgram, setBenefit } from "../lib/loyalty/loyaltyProgramEngine";

// Route: /clients/loyalty -- "Club & Fidélité": the hotel's loyalty club (see
// lib/loyalty/loyaltyProgramEngine.js), the same desk as the dashboard's modal.
export default function ClientsLoyalty() {
  const { careerState, error, applyHotelAdjustment } = useCareerContext();

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Relation client</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Club & Fidélité</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour créer le club de fidélité de votre hôtel.</p>
          </div>
        </header>
        <Card><Link to="/dashboard"><Button>← Retour au tableau de bord</Button></Link></Card>
      </div>
    );
  }

  const date = careerReferenceDate(careerState);
  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Relation client</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Club & Fidélité</h1>
          <p className="mt-1 text-sm text-slate-500">Membres, réservations directes, économies de commission et avantages -- jour {careerState.day}.</p>
        </div>
        <Link to="/clients/reviews"><Button variant="outline">← Avis clients</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <Card>
        <LoyaltyPanel
          hotelState={careerState.hotel?.hotelState}
          reservations={careerState.hotel?.reservations}
          date={date}
          onLaunch={() => applyHotelAdjustment((hotel) => launchProgram(hotel, { day: careerState.day, date })).catch(() => undefined)}
          onToggleBenefit={(id, enabled) => applyHotelAdjustment((hotel) => setBenefit(hotel, id, enabled)).catch(() => undefined)}
        />
      </Card>
    </div>
  );
}
