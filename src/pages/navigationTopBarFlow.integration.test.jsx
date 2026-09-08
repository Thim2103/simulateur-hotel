// Integration test: clicking through the real top-bar (see
// components/navigation/TopBar.jsx) against the real <App/> -- Dashboard
// -> Hôtel -> Restaurant -> RM -> Finance -- confirms the dropdowns
// actually route to their real pages, not just that each page renders in
// isolation (see TopBar.test.jsx for the isolated unit tests).
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

jest.mock("../lib/calculs/rm", () => ({
  getRooms: jest.fn(async () => []),
  getReservations: jest.fn(async () => []),
  occupationRate: jest.fn(() => 0),
  adr: jest.fn(() => 0),
  revpar: jest.fn(() => 0),
  integratedHotelReputation: jest.fn(() => 0),
  getRMStats: jest.fn(async () => ({
    occupancy: 0,
    adr: 0,
    revpar: 0,
    revenue: 0,
    forecastAdvanced: { next30: 0 },
    pickup: {},
    segmentation: { corporate: 0, leisure: 0, ota: 0, groups: 0 },
    revenueByRoomType: {},
    heatmap: {},
  })),
}));

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, "", "/");
});

test("Dashboard -> Hôtel -> Restaurant -> RM -> Finance, all through the top-bar", async () => {
  render(<App />);

  // Dashboard (/): the top-bar's own "Dashboard" entry is present.
  await waitFor(() => expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument());

  // Hôtel -> Chambres (/rooms).
  fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Chambres" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Chambres" })).toBeInTheDocument());

  // Restaurant -> Menu (/restaurant/menu). RestaurantSimulator.jsx's own
  // top-level gate reads through the legacy, pre-Guest-Mode
  // useRestaurantSimulator()/useSupabaseRestaurant() hook (not the
  // guest-aware useRestaurant.js RestaurantDashboard.jsx/
  // RestaurantStructure.jsx use once past that gate -- a pre-existing
  // inconsistency, not introduced by the top-bar work here), so with no
  // real Supabase session it shows its own connection-error state
  // instead of the establishment view. That still proves the route
  // itself changed correctly, which is what this test is about.
  fireEvent.click(screen.getByRole("button", { name: "Restaurant" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Menu" }));
  await waitFor(() => expect(screen.getByText(/connexion aux données restaurant indisponible/i)).toBeInTheDocument());

  // RM -> Pricing (/rm-dashboard#rm-pricing).
  fireEvent.click(screen.getByRole("button", { name: "RM" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Pricing" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions & pricing/i })).toBeInTheDocument());

  // Finance (/finance), a plain top-level submenu item.
  fireEvent.click(screen.getByRole("button", { name: "Finance" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Revenus" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Finance" })).toBeInTheDocument());
});
