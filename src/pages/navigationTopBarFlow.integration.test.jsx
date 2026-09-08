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
  // "/" now always redirects to the Menu Principal (/menu, see App.js) --
  // the in-game Dashboard this test starts from lives at /dashboard.
  window.history.pushState({}, "", "/dashboard");
});

test("Dashboard -> Hôtel -> Restaurant -> RM -> Finance, all through the top-bar", async () => {
  render(<App />);

  // Dashboard (/dashboard): the top-bar's own "Dashboard" entry is present.
  await waitFor(() => expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument());

  // Hôtel -> Chambres (/rooms).
  fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Chambres" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Chambres" })).toBeInTheDocument());

  // Restaurant -> Menu (/restaurant/menu). RestaurantSimulator.jsx's own
  // top-level gate goes through useRestaurantSimulator()/
  // useSupabaseRestaurant() -> lib/restaurantRepository.js, which is now
  // guest-aware (see restaurantRepository.js's loadGuestRestaurantState())
  // -- with no real Supabase session configured, resolveSession() falls
  // back to a guest session and this loads cleanly instead of erroring.
  // (lib/normalizers.js's normalizeProgression() strips `ready`, so the
  // page's own gate always shows the Structure form first regardless of
  // Supabase vs guest -- a pre-existing, unrelated quirk; what this test
  // cares about is that it renders at all, with no Supabase error.)
  fireEvent.click(screen.getByRole("button", { name: "Restaurant" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Menu" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /pilotez votre établissement/i })).toBeInTheDocument());

  // RM -> Pricing (/rm-dashboard#rm-pricing).
  fireEvent.click(screen.getByRole("button", { name: "RM" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Pricing" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions & pricing/i })).toBeInTheDocument());

  // Finance (/finance), a plain top-level submenu item.
  fireEvent.click(screen.getByRole("button", { name: "Finance" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Revenus" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Finance" })).toBeInTheDocument());
});
