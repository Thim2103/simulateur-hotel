// Integration test: the real end-to-end flow through the new pre-game
// screens -- MainMenu -> PlayMenu -> SelectMode -> Career -- exactly as a
// player would click through it, against the real <App/> (no mocks on
// the pages or hooks themselves). Confirms section 5's routing wiring and
// section 1-3's page-to-page handoffs actually work together, not just
// each page in isolation (see MainMenu.test.jsx/PlayMenu.test.jsx/
// SelectMode.test.jsx for the isolated unit tests).
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

// Same as App.test.js: PMS/RM screens read hotel data through this
// module; without a mock the real (network-backed) implementation would
// run in every test that happens to render one of them while clicking
// through the app.
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
  window.history.pushState({}, "", "/menu");
});

test("Menu -> Jouer -> Mode invité -> Sélection du mode -> Carrière", async () => {
  render(<App />);

  // MainMenu (/menu): full-bleed, no top-bar.
  expect(screen.getByRole("heading", { name: "Hospitality Lab" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("link", { name: "Jouer" }));

  // PlayMenu (/play): NODE_ENV is "test" here, so isDevMode() is true and
  // the guest shortcut is shown without needing a pre-existing session.
  await waitFor(() => expect(screen.getByRole("button", { name: "Mode invité" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));

  // SelectMode (/select-mode).
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));

  // CareerDashboard (/career), now wrapped by the top-bar (in-game route)
  // and running in Guest Mode, per the session just created. Its own
  // loadCareerState() now also awaits resolveSession() (see useCareer.js's
  // docstring), so this needs its own wait rather than assuming it's
  // already settled by the time the top-bar (unrelated to Career's own
  // loading state) has rendered.
  await waitFor(() => expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
});
