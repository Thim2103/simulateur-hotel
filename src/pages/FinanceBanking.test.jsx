import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FinanceBanking from "./FinanceBanking";
import { useCareerContext } from "../context/CareerContext";
import { takeLoan, activeLoans } from "../lib/banking/bankingLoanEngine";

jest.mock("../context/CareerContext");

const rich = () => ({ finance: { revenue: [100000], costs: [20000] }, structure: { starRating: 4 }, progression: { player: { reputation: 60 } } });
const career = (hotelState) => ({ day: 4, startDate: "2026-09-14", hotel: { rooms: [], reservations: [], hotelState } });
const mount = (value) => {
  useCareerContext.mockReturnValue({ careerState: null, error: null, applyHotelAdjustment: jest.fn().mockResolvedValue(null), ...value });
  return render(<FinanceBanking />, { wrapper: MemoryRouter });
};

test("asks to start a career when there is none", () => {
  mount();
  expect(screen.getByRole("heading", { level: 1, name: /banque & emprunts/i })).toBeInTheDocument();
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
  expect(screen.queryByTestId("banking-panel")).not.toBeInTheDocument();
});

test("shows the bank's desk with the day, and a way back to the finance pages", () => {
  mount({ careerState: career(rich()) });
  expect(screen.getByTestId("banking-panel")).toBeInTheDocument();
  expect(screen.getByText(/jour 4/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /finance/i })).toHaveAttribute("href", "/finance");
});

test("taking a loan applies it to the hotel with the career's day and date", () => {
  const applyHotelAdjustment = jest.fn().mockResolvedValue(null);
  mount({ careerState: career(rich()), applyHotelAdjustment });
  fireEvent.change(screen.getByTestId("banking-amount-cash"), { target: { value: "8000" } });
  fireEvent.click(screen.getByTestId("banking-take-cash"));
  expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
  const next = applyHotelAdjustment.mock.calls[0][0](career(rich()).hotel);
  expect(activeLoans(next.hotelState)[0]).toMatchObject({ type: "cash", principal: 8000, startDay: 4, startDate: "2026-09-18" });
});

test("repaying a loan applies it to the hotel", () => {
  const applyHotelAdjustment = jest.fn().mockResolvedValue(null);
  const lent = takeLoan({ hotelState: rich() }, "cash", 5000, { day: 1 }).hotelState;
  mount({ careerState: career(lent), applyHotelAdjustment });
  fireEvent.click(screen.getByTestId("banking-repay-loan:1"));
  const next = applyHotelAdjustment.mock.calls[0][0](career(lent).hotel);
  expect(activeLoans(next.hotelState)).toEqual([]);
});

test("shows an error from the career", () => {
  mount({ careerState: career(rich()), error: new Error("boom") });
  expect(screen.getByText(/une erreur est survenue : boom/i)).toBeInTheDocument();
});
