import { render, screen, fireEvent, within } from "@testing-library/react";
import AccountingPanel from "./AccountingPanel";
import AccountingModal from "./AccountingModal";
import { purchaseItems } from "../../lib/suppliers/suppliersEngine";
import { takeLoan } from "../../lib/banking/bankingLoanEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [35000], costs: [0] }, expansion: { availableCapital: 0 }, ...extra });
const restaurant = (extra = {}) => ({ finance: { revenue: [0], costs: [0] }, ...extra });
const panel = (hotelState = hotel(), restaurantState = restaurant(), day = 0) => render(<AccountingPanel hotelState={hotelState} restaurantState={restaurantState} day={day} />);

describe("AccountingPanel / the toggle", () => {
  it("opens in Débutant mode, with the Expert tables hidden", () => {
    panel();
    expect(screen.getByTestId("accounting-mode-beginner")).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByTestId("accounting-expert-tables")).not.toBeInTheDocument();
    expect(screen.getByTestId("accounting-card-treasury")).toBeInTheDocument();
  });

  it("switches to the Expert PCMN tables", () => {
    panel();
    fireEvent.click(screen.getByTestId("accounting-mode-expert"));
    expect(screen.getByTestId("accounting-mode-expert")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("accounting-expert-tables")).toBeInTheDocument();
    expect(screen.queryByTestId("accounting-card-treasury")).not.toBeInTheDocument();
  });

  it("says the balance holds, in both modes", () => {
    panel();
    expect(screen.getByTestId("accounting-balance-check")).toHaveTextContent("Bilan équilibré");
    fireEvent.click(screen.getByTestId("accounting-mode-expert"));
    expect(screen.getByTestId("accounting-balance-check")).toHaveTextContent("Bilan équilibré");
  });
});

describe("AccountingPanel / Débutant", () => {
  it("shows the treasury and the fonds propres for a brand-new hotel", () => {
    panel();
    expect(screen.getByTestId("accounting-card-treasury")).toHaveTextContent("35 000");
    expect(screen.getByTestId("accounting-card-equity")).toHaveTextContent("35 000");
    expect(screen.getByTestId("accounting-card-immo")).toHaveTextContent("0");
  });

  it("shows an immobilisation once something is bought", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    panel(state, restaurant(), 1);
    expect(screen.getByTestId("accounting-card-immo")).toHaveTextContent("520");
  });

  it("shows the loan as a debt", () => {
    const state = takeLoan({ hotelState: hotel() }, "cash", 5000, { day: 1 }).hotelState;
    panel(state);
    expect(screen.getByTestId("accounting-card-loans")).toHaveTextContent("5 000");
  });

  it("shows an overdraft card only when the account is overdrawn", () => {
    panel();
    expect(screen.queryByTestId("accounting-card-overdraft")).not.toBeInTheDocument();
    panel(hotel({ finance: { revenue: [0], costs: [4000] } }));
    expect(screen.getByTestId("accounting-card-overdraft")).toHaveTextContent("4 000");
  });

  it("gives the plain-words result: revenue − charges = net", () => {
    panel(hotel({ finance: { revenue: [10000], costs: [4000] } }));
    expect(screen.getByTestId("accounting-result-revenue")).toHaveTextContent("10 000");
    expect(screen.getByTestId("accounting-result-charges")).toHaveTextContent("4 000");
    expect(screen.getByTestId("accounting-result-net")).toHaveTextContent("6 000");
  });
});

describe("AccountingPanel / Expert PCMN", () => {
  it("lists every immobilisation at its real PCMN account", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    panel(state, restaurant(), 1);
    fireEvent.click(screen.getByTestId("accounting-mode-expert"));
    expect(screen.getByTestId("accounting-row-24010")).toHaveTextContent("520");
  });

  it("lists Capital, Emprunts and Trésorerie on the passif/actif tables", () => {
    const state = takeLoan({ hotelState: hotel() }, "cash", 5000, { day: 1 }).hotelState;
    panel(state);
    fireEvent.click(screen.getByTestId("accounting-mode-expert"));
    expect(screen.getByTestId("accounting-row-173")).toHaveTextContent("5 000");
    expect(screen.getByTestId("accounting-row-100")).toBeInTheDocument();
    expect(screen.getByTestId("accounting-row-5500")).toBeInTheDocument();
  });

  it("lists the income statement's PCMN lines", () => {
    panel(hotel({ finance: { revenue: [12000], costs: [0] } }), restaurant({ finance: { revenue: [3000], costs: [0] } }));
    fireEvent.click(screen.getByTestId("accounting-mode-expert"));
    expect(screen.getByTestId("accounting-row-704")).toHaveTextContent("12 000");
    expect(screen.getByTestId("accounting-row-702")).toHaveTextContent("3 000");
    expect(screen.getByTestId("accounting-row-630")).toBeInTheDocument();
    expect(screen.getByTestId("accounting-row-650")).toBeInTheDocument();
  });
});

describe("AccountingModal", () => {
  const modal = (props = {}) => render(<AccountingModal hotelState={hotel()} restaurantState={restaurant()} day={0} onClose={jest.fn()} {...props} />);

  it("opens as a dialog with the panel, carrying the mice tone", () => {
    modal();
    const dialog = screen.getByRole("dialog", { name: /bilan comptable/i });
    // eslint-disable-next-line testing-library/no-node-access -- the tone sits on the modal's own surface
    expect(dialog.firstChild).toHaveAttribute("data-tone", "mice");
    expect(within(dialog).getByTestId("accounting-panel")).toBeInTheDocument();
  });

  it("closes", () => {
    const onClose = jest.fn();
    modal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
