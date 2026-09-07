import { render, screen, fireEvent } from "@testing-library/react";
import StaffDashboard from "./StaffDashboard";
import { useChainContext } from "../context/ChainContext";
import { useStaff } from "../hooks/useStaff";

jest.mock("../context/ChainContext");
jest.mock("../hooks/useStaff");

function hotel(overrides = {}) {
  return { id: "a", name: "Riviera Palace", city: "Nice", restaurantState: { staff: [] }, ...overrides };
}

function staffMember(overrides = {}) {
  return { id: 1, name: "Ada", satisfaction: 70, ...overrides };
}

function sampleReport(overrides = {}) {
  return {
    staffGlobal: [staffMember()],
    staffByHotel: { a: [staffMember()] },
    moraleGlobal: 70,
    moraleByHotel: { a: 70 },
    transfers: [],
    training: [],
    promotions: [],
    regionalEvents: [],
    optimization: { recommendations: [] },
    ...overrides,
  };
}

function baseStaffHook(overrides = {}) {
  return {
    staffState: { hotels: [] },
    setHotels: jest.fn(),
    staffReport: null,
    transferStaff: jest.fn(),
    trainStaff: jest.fn(),
    optimizeStaff: jest.fn().mockResolvedValue(sampleReport()),
    isRunning: false,
    error: null,
    ...overrides,
  };
}

beforeEach(() => {
  useChainContext.mockReturnValue({ chainState: { hotels: [] } });
});

test("shows an empty state when the chain has no hotels", () => {
  useStaff.mockReturnValue(baseStaffHook());
  render(<StaffDashboard />);

  expect(screen.getByText(/aucun hôtel dans la chaîne/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /optimiser le personnel/i })).toBeDisabled();
});

test("prompts to run the first analysis once hotels exist but no report yet", () => {
  useChainContext.mockReturnValue({ chainState: { hotels: [hotel()] } });
  useStaff.mockReturnValue(baseStaffHook({ staffState: { hotels: [hotel()] } }));
  render(<StaffDashboard />);

  expect(screen.getByText(/cliquez sur « optimiser le personnel »/i)).toBeInTheDocument();
});

test("displays global/local morale, transfers, training, promotions, events and recommendations once a report is available", () => {
  useChainContext.mockReturnValue({ chainState: { hotels: [hotel()] } });
  useStaff.mockReturnValue(
    baseStaffHook({
      staffState: { hotels: [hotel()] },
      staffReport: sampleReport({
        transfers: [{ staffId: 1, staffName: "Ada", fromHotelId: "a", toHotelId: "b", reason: "Ratio déséquilibré" }],
        training: [{ staffId: 1, staffName: "Ada", hotelId: "a", skillBefore: 40, skillAfter: 45 }],
        promotions: [{ staffId: 1, staffName: "Ada", hotelId: "a", fromRole: "Serveur", toRole: "Serveur senior" }],
        regionalEvents: [{ id: "r1", city: "Nice", message: "Une grève régionale touche le personnel." }],
        optimization: { recommendations: [{ id: "rec1", message: "Renforcer l'effectif à Nice", priority: "high" }] },
      }),
    })
  );
  render(<StaffDashboard />);

  expect(screen.getAllByText("70/100").length).toBeGreaterThan(0);
  expect(screen.getByText(/ratio déséquilibré/i)).toBeInTheDocument();
  expect(screen.getByText(/compétence 40 → 45/i)).toBeInTheDocument();
  expect(screen.getByText(/serveur → serveur senior/i)).toBeInTheDocument();
  expect(screen.getByText(/grève régionale/i)).toBeInTheDocument();
  expect(screen.getByText(/renforcer l'effectif à nice/i)).toBeInTheDocument();
});

test("clicking the optimize button calls optimizeStaff", () => {
  const optimizeStaff = jest.fn().mockResolvedValue(sampleReport());
  useChainContext.mockReturnValue({ chainState: { hotels: [hotel()] } });
  useStaff.mockReturnValue(baseStaffHook({ staffState: { hotels: [hotel()] }, optimizeStaff }));
  render(<StaffDashboard />);

  fireEvent.click(screen.getByRole("button", { name: /optimiser le personnel/i }));
  expect(optimizeStaff).toHaveBeenCalled();
});

test("shows an error banner when the staff engine fails", () => {
  useChainContext.mockReturnValue({ chainState: { hotels: [hotel()] } });
  useStaff.mockReturnValue(baseStaffHook({ staffState: { hotels: [hotel()] }, error: new Error("boom") }));
  render(<StaffDashboard />);

  expect(screen.getByText(/impossible de calculer le rapport rh/i)).toBeInTheDocument();
});
