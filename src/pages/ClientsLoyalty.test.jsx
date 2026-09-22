import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientsLoyalty from "./ClientsLoyalty";
import { useCareerContext } from "../context/CareerContext";
import { launchProgram } from "../lib/loyalty/loyaltyProgramEngine";

jest.mock("../context/CareerContext");

const career = (hotelState) => ({ day: 4, startDate: "2026-09-14", hotel: { rooms: [], reservations: [], hotelState } });
const rich = (treasury = 50000) => ({ finance: { revenue: [treasury], costs: [0] }, progression: { player: { reputation: 70 } } });
const mount = (value) => {
  useCareerContext.mockReturnValue({ careerState: null, error: null, applyHotelAdjustment: jest.fn().mockResolvedValue(null), ...value });
  return render(<ClientsLoyalty />, { wrapper: MemoryRouter });
};

test("asks to start a career when there is none", () => {
  mount();
  expect(screen.getByRole("heading", { level: 1, name: /club & fidélité/i })).toBeInTheDocument();
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
  expect(screen.queryByTestId("loyalty-panel")).not.toBeInTheDocument();
});

test("shows the desk with the day, and a way back to the reviews", () => {
  mount({ careerState: career(rich()) });
  expect(screen.getByTestId("loyalty-panel")).toHaveAttribute("data-launched", "false");
  expect(screen.getByText(/jour 4/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /avis clients/i })).toHaveAttribute("href", "/clients/reviews");
});

test("launching the club applies it to the hotel with the career's day and date", () => {
  const applyHotelAdjustment = jest.fn().mockResolvedValue(null);
  mount({ careerState: career(rich()), applyHotelAdjustment });
  fireEvent.click(screen.getByTestId("loyalty-launch"));
  expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
  const next = applyHotelAdjustment.mock.calls[0][0](career(rich()).hotel);
  expect(next.hotelState.loyalty).toMatchObject({ launched: true, launchedDay: 4, launchedOn: "2026-09-18" });
  expect(next.hotelState.finance.costs).toEqual([5000]);
});

test("a perk is set through the hotel adjustment", () => {
  const applyHotelAdjustment = jest.fn().mockResolvedValue(null);
  const launched = launchProgram({ hotelState: rich() }, { day: 1 }).hotelState;
  mount({ careerState: career(launched), applyHotelAdjustment });
  fireEvent.click(screen.getByTestId("loyalty-toggle-breakfast"));
  const next = applyHotelAdjustment.mock.calls[0][0](career(launched).hotel);
  expect(next.hotelState.loyalty.benefits.breakfast).toBe(true);
});

test("shows an error from the career", () => {
  mount({ careerState: career(rich()), error: new Error("boom") });
  expect(screen.getByText(/une erreur est survenue : boom/i)).toBeInTheDocument();
});
