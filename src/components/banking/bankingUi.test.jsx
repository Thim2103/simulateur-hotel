import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BankingPanel from "./BankingPanel";
import BankingModal from "./BankingModal";
import { takeLoan, advanceBanking, LOAN_TYPES } from "../../lib/banking/bankingLoanEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [100000], costs: [20000] }, structure: { starRating: 4 }, progression: { player: { reputation: 60 } }, ...extra });
const borrow = (state, typeId, amount) => takeLoan({ hotelState: state }, typeId, amount, { day: 1, date: new Date("2026-09-14T12:00:00Z") }).hotelState;
const panel = (hotelState, props = {}) => render(<BankingPanel hotelState={hotelState} onTake={jest.fn()} onRepay={jest.fn()} {...props} />);
const compact = (text) => text.replace(/\s| | /g, "");

describe("BankingPanel / financial health", () => {
  it("shows the credit score on a gauge with its rating", () => {
    panel(hotel());
    expect(screen.getByTestId("banking-score")).toHaveTextContent("70/100");
    expect(screen.getByRole("meter", { name: "Score de crédit" })).toHaveAttribute("aria-valuenow", "70");
    expect(screen.getByTestId("banking-rating")).toHaveTextContent("Bon");
  });

  it("gives the account, the debt, what may still be borrowed and the solvency", () => {
    panel(hotel());
    expect(compact(screen.getByTestId("banking-balance").textContent)).toContain("80000€");
    expect(compact(screen.getByTestId("banking-debt").textContent)).toContain("0€");
    expect(compact(screen.getByTestId("banking-capacity").textContent)).toContain("140000€");
    expect(screen.getByTestId("banking-solvency")).toHaveTextContent("—");
    expect(screen.getByTestId("banking-solvency")).toHaveTextContent("aucune dette");
  });

  it("with a debt, gives the solvency ratio and less capacity", () => {
    panel(borrow(hotel(), "investment", 30000));
    expect(screen.getByTestId("banking-solvency")).toHaveTextContent(/\d+(,\d+)?×/);
    expect(screen.getByTestId("banking-solvency")).toHaveTextContent("fonds propres / dette");
    expect(compact(screen.getByTestId("banking-debt").textContent)).toContain("30000€");
    expect(compact(screen.getByTestId("banking-capacity").textContent)).toContain("110000€");
  });

  it("says the hotel's stars and its record", () => {
    panel(hotel({ banking: { repaidLoans: 2, overdraftDays: 1, missedPayments: 0 } }));
    expect(screen.getByText(/Hôtel 4★ · 2 crédits remboursés · 1 jour à découvert · 0 échéance manquée/)).toBeInTheDocument();
  });

  it("warns loudly of an overdrawn account", () => {
    panel(hotel({ finance: { revenue: [0], costs: [3000] } }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Compte à découvert de 3\s?000 €.*agios/);
    expect(screen.getByTestId("banking-balance")).toHaveAttribute("data-tone", "danger");
  });

  it("no alert for a healthy account", () => {
    panel(hotel());
    expect(screen.queryByTestId("banking-overdraft")).not.toBeInTheDocument();
  });
});

describe("BankingPanel / the loans on offer", () => {
  it("lists the three, each with its rate, its term and its description", () => {
    panel(hotel());
    ["cash", "investment", "bond"].forEach((id) => {
      const offer = screen.getByTestId(`banking-offer-${id}`);
      expect(offer).toHaveTextContent(LOAN_TYPES[id].label);
      expect(offer).toHaveTextContent(`${LOAN_TYPES[id].termDays} jours`);
      expect(offer).toHaveTextContent(`Taux ${LOAN_TYPES[id].rateLabel}`);
    });
    expect(screen.getByTestId("banking-offer-cash")).toHaveTextContent("Taux élevé");
    expect(screen.getByTestId("banking-offer-bond")).toHaveTextContent("Taux bas");
  });

  it("lets the player choose the amount of the first two, from their range", () => {
    panel(hotel());
    const cash = within(screen.getByTestId("banking-amount-cash"));
    expect(cash.getAllByRole("option").map((option) => Number(option.value))).toEqual([5000, 6000, 7000, 8000, 9000, 10000]);
    expect(within(screen.getByTestId("banking-amount-investment")).getAllByRole("option").map((option) => Number(option.value))).toEqual([25000, 30000, 35000, 40000, 45000, 50000]);
  });

  it("the bond has one amount, 100 000 EUR", () => {
    panel(hotel());
    expect(screen.queryByTestId("banking-amount-bond")).not.toBeInTheDocument();
    expect(compact(screen.getByTestId("banking-fixed-bond").textContent)).toBe("100000€");
  });

  it("quotes the choice: first instalment, interest, fee", () => {
    panel(hotel());
    fireEvent.change(screen.getByTestId("banking-amount-cash"), { target: { value: "10000" } });
    const text = compact(screen.getByTestId("banking-quote-cash").textContent);
    expect(text).toContain("373,33€");
    expect(text).toContain("620€");
    expect(text).toContain("fraisdedossier:100€");
  });

  it("borrows the amount chosen", () => {
    const onTake = jest.fn();
    panel(hotel(), { onTake });
    fireEvent.change(screen.getByTestId("banking-amount-investment"), { target: { value: "35000" } });
    fireEvent.click(screen.getByTestId("banking-take-investment"));
    expect(onTake).toHaveBeenCalledWith("investment", 35000);
  });

  it("borrows the smallest amount if the player does not choose", () => {
    const onTake = jest.fn();
    panel(hotel(), { onTake });
    fireEvent.click(screen.getByTestId("banking-take-cash"));
    expect(onTake).toHaveBeenCalledWith("cash", 5000);
    fireEvent.click(screen.getByTestId("banking-take-bond"));
    expect(onTake).toHaveBeenLastCalledWith("bond", 100000);
  });

  it("refuses the bond to a 3-star hotel, and says why", () => {
    panel(hotel({ structure: { starRating: 3 } }));
    expect(screen.getByTestId("banking-take-bond")).toBeDisabled();
    expect(screen.getByTestId("banking-reason-bond")).toHaveTextContent("Réservé aux hôtels 4★ et plus");
    expect(screen.getByTestId("banking-offer-bond")).toHaveAttribute("data-available", "false");
    expect(screen.getByTestId("banking-take-cash")).toBeEnabled();
  });

  it("refuses the bond when the score is too low", () => {
    panel(hotel({ progression: { player: { reputation: 40 } } }));
    expect(screen.getByTestId("banking-reason-bond")).toHaveTextContent(/Score de crédit insuffisant \(70 requis, vous avez \d+\)/);
  });

  it("a loan already taken cannot be taken twice", () => {
    panel(borrow(hotel(), "cash", 5000));
    expect(screen.getByTestId("banking-take-cash")).toBeDisabled();
    expect(screen.getByTestId("banking-reason-cash")).toHaveTextContent("déjà en cours");
    expect(screen.getByTestId("banking-take-investment")).toBeEnabled();
  });

  it("only offers the amounts the bank would lend", () => {
    // Reputation 0: score 55 -> ceiling 110 000; an investment loan of 50 000 already runs.
    const state = borrow(hotel({ progression: { player: { reputation: 0 } } }), "investment", 50000);
    panel(state);
    expect(within(screen.getByTestId("banking-amount-cash")).getAllByRole("option")).toHaveLength(6);
  });
});

describe("BankingPanel / the loans in progress", () => {
  const running = () => {
    let state = borrow(hotel(), "cash", 9000);
    for (let i = 0; i < 10; i += 1) state = advanceBanking(state, { date: new Date(`2026-09-${15 + i}T12:00:00Z`), day: 2 + i });
    return state;
  };

  it("shows nothing in progress before any loan", () => {
    panel(hotel());
    expect(screen.queryByRole("region", { name: /crédits en cours/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("banking-due")).not.toBeInTheDocument();
  });

  it("lists each loan with what is left, the days left and the day's instalment", () => {
    panel(running());
    const loan = screen.getByTestId("banking-loan-loan:1");
    expect(loan).toHaveTextContent("Crédit de trésorerie");
    expect(compact(screen.getByTestId("banking-balance-loan:1").textContent)).toBe("6000€");
    expect(loan).toHaveTextContent("20 jours");
    expect(loan).toHaveTextContent("33 % remboursé");
    expect(screen.getByRole("meter", { name: /remboursement : crédit de trésorerie/i })).toHaveAttribute("aria-valuenow", "33");
  });

  it("gives the total due each day", () => {
    panel(running());
    expect(compact(screen.getByTestId("banking-due").textContent)).toMatch(/^\d+€àpayerchaquejour$/);
  });

  it("repays early for the balance plus 1 %", () => {
    const onRepay = jest.fn();
    panel(running(), { onRepay });
    expect(compact(screen.getByTestId("banking-repay-loan:1").textContent)).toContain("6060€");
    fireEvent.click(screen.getByTestId("banking-repay-loan:1"));
    expect(onRepay).toHaveBeenCalledWith("loan:1");
  });

  it("cannot repay when the treasury falls short, and says so", () => {
    const state = running();
    const poor = { ...state, finance: { revenue: [100], costs: [0] }, banking: { ...state.banking, cashAdjustment: 0 } };
    panel(poor);
    expect(screen.getByTestId("banking-repay-loan:1")).toBeDisabled();
    expect(screen.getByTestId("banking-repay-reason-loan:1")).toHaveTextContent(/Trésorerie insuffisante/);
  });

  it("tells the last thing that happened, and the tallies", () => {
    panel(running());
    expect(screen.getByTestId("banking-outcome")).toHaveTextContent(/Crédit de trésorerie de 9\s?000 € accordé/);
    expect(screen.getByTestId("banking-ledger")).toHaveTextContent(/3\s?000 € de capital remboursé/);
  });
});

describe("BankingModal", () => {
  const modal = (props = {}) =>
    render(
      <MemoryRouter>
        <BankingModal hotelState={hotel()} onTake={jest.fn()} onRepay={jest.fn()} onClose={jest.fn()} {...props} />
      </MemoryRouter>
    );

  it("opens as a dialog with the panel", () => {
    modal();
    expect(screen.getByRole("dialog", { name: /banque & emprunts/i }).firstChild).toHaveAttribute("data-tone", "success");
    expect(within(screen.getByRole("dialog")).getByTestId("banking-panel")).toBeInTheDocument();
  });

  it("links to the bank's page", () => {
    modal();
    expect(screen.getByRole("link", { name: /ouvrir la page de la banque/i })).toHaveAttribute("href", "/finance/banking");
  });

  it("passes the actions through and closes", () => {
    const onTake = jest.fn();
    const onClose = jest.fn();
    modal({ onTake, onClose });
    fireEvent.click(screen.getByTestId("banking-take-cash"));
    expect(onTake).toHaveBeenCalledWith("cash", 5000);
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
