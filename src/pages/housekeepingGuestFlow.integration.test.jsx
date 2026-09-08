// Integration test: Guest Mode + Housekeeping -- the refonted
// Housekeeping pages (HousekeepingDashboard/HousekeepingForecast/
// HousekeepingReport) load cleanly as a guest, with zero Supabase
// errors, through the real <App/> and the real top-bar navigation (see
// the Refonte Housekeeping request's section 7 and
// financeGuestFlow.integration.test.jsx/staffGuestFlow.integration.test
// .jsx/marketingGuestFlow.integration.test.jsx/esgGuestFlow.integration
// .test.jsx for the same pattern applied to Finance/Staff/Marketing/ESG).
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

test("Mode invité -> Carrière -> Housekeeping -> Prévisions -> Rapport, zero Supabase error at any step", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

  fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
  await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
  await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

  // Housekeeping (/housekeeping), through the top-bar's Hôtel dropdown.
  fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Housekeeping" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Housekeeping" })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText(/diagnostics housekeeping/i)).toBeInTheDocument());
  expectNoSupabaseError();

  // Prévisions (/housekeeping/forecast).
  fireEvent.click(screen.getByRole("link", { name: /prévisions/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions housekeeping/i })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("tab", { name: "Réaliste" })).toBeInTheDocument());
  expectNoSupabaseError();

  // Rapport complet (/housekeeping/report).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Housekeeping" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /^rapport$/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /rapport housekeeping complet/i })).toBeInTheDocument());
  expectNoSupabaseError();
}, 15000);
