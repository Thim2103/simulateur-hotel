// Integration test: top-bar navigation while running as a guest session
// (see hooks/useSupabaseSession.js's fallback) -- confirms every business
// page reachable from the top-bar now loads cleanly in Guest Mode, with
// zero Supabase errors, after extending the guest branch from Career/
// Restaurant(Structure)/Dashboard (the original Guest Mode PR's scope) to
// the rest of the app's persistence layer: lib/pmsRepository.js,
// lib/hotelRepository.js and lib/restaurantRepository.js (see each
// file's own guest-branch tests for the unit-level coverage; this file
// is the "does it actually work end to end, through the real navigation"
// proof).
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, "", "/play");
});

function expectNoSupabaseError() {
  expect(screen.queryByText(/session supabase non authentifiee/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/pas configure/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/indisponible/i)).not.toBeInTheDocument();
}

test("Play -> Mode invité -> Sélection du mode -> Carrière -> Dashboard, no Supabase error surfaced anywhere", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

  fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
  await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
  expectNoSupabaseError();

  fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
  await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());
  expectNoSupabaseError();

  // Dashboard (/dashboard), reached through the top-bar itself now that a
  // career (hence a resolved guest session) exists.
  fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
  await waitFor(() => expect(screen.getByText(/mon hôtel/i)).toBeInTheDocument());
  expectNoSupabaseError();
});

// The full business-page tour: every page the top-bar's own dropdowns
// (see components/navigation/TopBar.jsx) can reach, played as a guest,
// asserting real content loaded (not just "no error text") wherever
// that's cheap to check, and at minimum the absence of any Supabase
// error text everywhere.
test("Hôtel -> PMS -> RM -> Finance -> Marketing -> Staff -> ESG -> Restaurant, all playable as a guest with zero Supabase errors", async () => {
  const initial = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());
  initial.unmount();

  // Hôtel -> Chambres (/rooms) -- lib/pmsRepository.js's guest branch.
  window.history.pushState({}, "", "/rooms");
  const rooms = render(<App />);
  await waitFor(() => expect(rooms.getByRole("heading", { name: "Chambres" })).toBeInTheDocument());
  // The guest-seeded rooms (see lib/guest/guestPmsSeed.js) are listed, not
  // an empty/error table.
  await waitFor(() => expect(rooms.getByText("101")).toBeInTheDocument());
  rooms.unmount();

  // PMS -> Planning (/pms) -- lib/calculs/rm.js's getRooms/getReservations
  // wrap the same pmsRepository.js functions.
  window.history.pushState({}, "", "/pms");
  const pms = render(<App />);
  await waitFor(() => expect(pms.getByRole("heading", { name: "Planning PMS" })).toBeInTheDocument());
  expectNoSupabaseError();
  pms.unmount();

  // RM -> Pricing (/rm-dashboard#rm-pricing) -- hooks/useRM.js, itself
  // built on the now guest-aware pmsRepository.js.
  window.history.pushState({}, "", "/rm-dashboard");
  const rm = render(<App />);
  await waitFor(() => expect(rm.getByRole("heading", { name: /prévisions & pricing/i })).toBeInTheDocument());
  expectNoSupabaseError();
  rm.unmount();

  // Finance (/finance) -- hooks/useHotelSimulator.js -> useSupabaseHotel.js
  // -> lib/hotelRepository.js's guest branch.
  window.history.pushState({}, "", "/finance");
  const finance = render(<App />);
  await waitFor(() => expect(finance.getByRole("heading", { name: "Finance" })).toBeInTheDocument());
  expectNoSupabaseError();
  finance.unmount();

  // Marketing (/marketing) -- now the Career/Guest-Mode Marketing module
  // (see the Refonte Marketing request: lib/marketing/, hooks/
  // useMarketingEngine.js, lib/marketingRepository.js), same guest-aware
  // pattern as Finance/Staff above. Without a career yet it prompts to
  // start one rather than showing figures, exactly like Finance/Staff's
  // own pages in this same flow.
  window.history.pushState({}, "", "/marketing");
  const marketing = render(<App />);
  await waitFor(() => expect(marketing.getByRole("heading", { name: "Marketing" })).toBeInTheDocument());
  expectNoSupabaseError();
  marketing.unmount();

  // Staff (/staff) -- now the Career/Guest-Mode HR module (see the
  // Refonte RH request: lib/staff/, hooks/useStaffEngine.js,
  // lib/staffRepository.js), same guest-aware pattern as Finance above.
  // Without a career yet it prompts to start one rather than showing
  // figures, exactly like Finance's own /finance in this same flow.
  window.history.pushState({}, "", "/staff");
  const staff = render(<App />);
  await waitFor(() => expect(staff.getByRole("heading", { name: "Staff" })).toBeInTheDocument());
  expectNoSupabaseError();
  staff.unmount();

  // Chain's own multi-site Staff page moved to /chain/staff (see
  // pages/ChainStaffDashboard.jsx) -- hooks/useStaff.js/useChain.js are
  // pure in-memory state (no Supabase dependency at all), so this was
  // already guest-safe by construction; asserted here so that stays true.
  window.history.pushState({}, "", "/chain/staff");
  const chainStaff = render(<App />);
  await waitFor(() => expect(chainStaff.getByRole("heading", { name: "Gestion du personnel" })).toBeInTheDocument());
  expectNoSupabaseError();
  chainStaff.unmount();

  // ESG (/esg) -- now the Career/Guest-Mode ESG module (see the Refonte
  // ESG request: lib/esg/, hooks/useEsgEngine.js, lib/esgRepository.js),
  // same guest-aware pattern as Finance/Staff/Marketing above. Without a
  // career yet it prompts to start one rather than showing figures,
  // exactly like Finance/Staff/Marketing's own pages in this same flow.
  window.history.pushState({}, "", "/esg");
  const esg = render(<App />);
  await waitFor(() => expect(esg.getByRole("heading", { name: "ESG" })).toBeInTheDocument());
  expectNoSupabaseError();
  esg.unmount();

  // Restaurant -> Menu (/restaurant/menu) -- hooks/useRestaurantSimulator.js
  // -> useSupabaseRestaurant.js -> lib/restaurantRepository.js's guest
  // branch (shares the "restaurant" namespace with useRestaurant.js's own
  // bypass, see restaurantRepository.js's header comment). Pre-existing,
  // unrelated quirk: lib/normalizers.js's normalizeProgression() strips
  // `ready`, so RestaurantSimulator.jsx's own gate always shows the
  // "Structure de l'établissement" form on this hook's first load
  // regardless of Supabase vs guest -- what matters here is that it does
  // so cleanly, with no Supabase error, not which of its two views renders.
  window.history.pushState({}, "", "/restaurant/menu");
  const restaurant = render(<App />);
  await waitFor(() => expect(restaurant.getByRole("heading", { name: /pilotez votre établissement/i })).toBeInTheDocument());
  expectNoSupabaseError();
  restaurant.unmount();
});
