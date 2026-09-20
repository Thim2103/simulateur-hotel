import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CorporateEvents from "./CorporateEvents";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../context/CareerContext");

const DAY = 86400000;
const START = "2026-09-14";
const at = (days) => new Date(Date.parse(`${START}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const rooms = [
  { id: 1, number: "101", type: "standard", status: "libre", price: 120, capacity: 2 },
  { id: 2, number: "102", type: "standard", status: "libre", price: 120, capacity: 2 },
  { id: 3, number: "201", type: "deluxe", status: "libre", price: 180, capacity: 3 },
  { id: 4, number: "202", type: "deluxe", status: "libre", price: 180, capacity: 3 },
  { id: 9, number: "S01", type: "seminar", status: "libre", price: 450, capacity: 20 },
];
const quote = { id: 1, company: "Novatek Solutions", attendees: 20, days: 2, startDate: at(10), receivedOn: START, expiresOn: at(6), expectedDiscount: 0.1, status: "pending" };

function career(extra = {}) {
  return {
    day: 0,
    startDate: START,
    status: "active",
    hotel: { hotelState: { finance: { revenue: [10000], costs: [0] }, mice: { requests: [quote], events: [], nextId: 2, lastOutcome: null } }, rooms, reservations: [] },
    missions: [],
    objectives: [],
    ...extra,
  };
}

test("prompts to start a career when there is none", () => {
  useCareerContext.mockReturnValue({ careerState: null, applyHotelAdjustment: jest.fn() });
  render(<CorporateEvents />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows the seminar desk: the waiting quote and the count", () => {
  useCareerContext.mockReturnValue({ careerState: career(), applyHotelAdjustment: jest.fn() });
  render(<CorporateEvents />, { wrapper: MemoryRouter });
  expect(screen.getByRole("heading", { name: /événements pro/i })).toBeInTheDocument();
  expect(screen.getByTestId("mice-request-1")).toHaveTextContent("Novatek Solutions");
  expect(screen.getByTestId("mice-pending-count")).toHaveTextContent("1 devis en attente");
});

test("answering a quote applies it to the hotel with the career's day and calendar date", () => {
  const applyHotelAdjustment = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ careerState: career(), applyHotelAdjustment });
  render(<CorporateEvents />, { wrapper: MemoryRouter });
  fireEvent.click(screen.getByTestId("mice-decline-1"));
  expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
  const next = applyHotelAdjustment.mock.calls[0][0](career().hotel);
  expect(next.hotelState.mice.requests[0].status).toBe("declined");
  expect(next.hotelState.mice.lastOutcome).toMatchObject({ outcome: "declined", day: 0 });
});

test("says what to do when the hotel has no meeting room", () => {
  useCareerContext.mockReturnValue({ careerState: career({ hotel: { hotelState: {}, rooms: rooms.slice(0, 4), reservations: [] } }), applyHotelAdjustment: jest.fn() });
  render(<CorporateEvents />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("mice-no-room")).toBeInTheDocument();
});

test("shows an error from the career", () => {
  useCareerContext.mockReturnValue({ careerState: career(), error: new Error("boom"), applyHotelAdjustment: jest.fn() });
  render(<CorporateEvents />, { wrapper: MemoryRouter });
  expect(screen.getByText(/une erreur est survenue : boom/i)).toBeInTheDocument();
});
