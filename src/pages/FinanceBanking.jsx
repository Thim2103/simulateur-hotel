import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import BankingPanel from "../components/banking/BankingPanel";
import { useCareerContext } from "../context/CareerContext";
import { careerReferenceDate } from "../lib/career/careerEngine";
import { takeLoan, repayLoan } from "../lib/banking/bankingLoanEngine";

// Route: /finance/banking -- "Banque & Emprunts": the hotel's loans and financial
// health (see lib/banking/bankingLoanEngine.js), the same desk as the
// dashboard's modal.
export default function FinanceBanking() {
  const { careerState, error, applyHotelAdjustment } = useCareerContext();

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Finance</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Banque & Emprunts</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour ouvrir un compte et emprunter.</p>
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
          <p className="eyebrow">Finance</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Banque & Emprunts</h1>
          <p className="mt-1 text-sm text-slate-500">Santé financière, crédits et échéances -- jour {careerState.day}.</p>
        </div>
        <Link to="/finance"><Button variant="outline">← Finance</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <Card>
        <BankingPanel
          hotelState={careerState.hotel?.hotelState}
          onTake={(typeId, amount) => applyHotelAdjustment((hotel) => takeLoan(hotel, typeId, amount, { day: careerState.day, date })).catch(() => undefined)}
          onRepay={(loanId) => applyHotelAdjustment((hotel) => repayLoan(hotel, loanId, { day: careerState.day })).catch(() => undefined)}
        />
      </Card>
    </div>
  );
}
