// Integration test: top-bar navigation while running as a guest session
// (see hooks/useSupabaseSession.js's fallback) -- confirms the pages
// Guest Mode actually covers (Dashboard, Mode Carrière) navigate and load
// cleanly with zero Supabase errors, and honestly documents where that
// coverage currently ends (see the comment on the last test below) rather
// than asserting something that isn't true yet.
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
  window.history.pushState({}, "", "/play");
});

test("Play -> Mode invité -> Sélection du mode -> Carrière -> Dashboard, no Supabase error surfaced anywhere", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

  fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
  await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
  expect(screen.queryByText(/session supabase non authentifiee/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
  await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());
  expect(screen.queryByText(/session supabase non authentifiee/i)).not.toBeInTheDocument();

  // Dashboard (/dashboard), reached through the top-bar itself now that a
  // career (hence a resolved guest session) exists.
  fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
  await waitFor(() => expect(screen.getByText(/mon hôtel/i)).toBeInTheDocument());
  expect(screen.queryByText(/session supabase non authentifiee/i)).not.toBeInTheDocument();
});

// Guest Mode's coverage today is exactly what the original Guest Mode PR
// scoped it to: Career (lib/career/, useCareer.js) and the general
// Dashboard (lib/dashboard/, useDashboard.js), both fixed for the mount-
// time session race in this PR. The standalone Hôtel/Restaurant/RM/PMS/
// Finance/Marketing/Staff/ESG pages reached from the top-bar's other
// dropdowns still read through the pre-Guest-Mode, Supabase-only data
// layer (lib/pmsRepository.js, lib/calculs/rm.js, hooks/useHotelSimulator
// .js, hooks/useRM.js, hooks/useStaff.js) and will still show a
// connection-error state for a guest session -- extending Guest Mode
// there is a much larger, separate project (a second data layer per
// module, the same shape Career/Restaurant/Dashboard already went
// through), not a navigation fix. This test documents that boundary
// instead of silently asserting something that isn't true yet.
test("a standalone Hôtel/PMS page not covered by Guest Mode still shows its own Supabase error (documented, pre-existing scope boundary)", async () => {
  const first = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());
  first.unmount();

  window.history.pushState({}, "", "/rooms");
  render(<App />);

  // lib/pmsRepository.js's listRooms() has no guest/localStorage fallback
  // at all -- it throws straight from assertSupabaseConfigured() in this
  // (Supabase-less) test environment, same as it would for a real guest
  // session.
  await waitFor(() => expect(screen.getAllByText(/pas configure/i).length).toBeGreaterThan(0));
});
