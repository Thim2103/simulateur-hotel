// Integration test: Guest Mode + Marketing -- the refonted Marketing
// pages (MarketingDashboard/MarketingCampaigns/MarketingChannels/
// MarketingForecast/MarketingReport) load cleanly as a guest, with zero
// Supabase errors, through the real <App/> and the real top-bar
// navigation (see the Refonte Marketing request's section 7 and
// financeGuestFlow.integration.test.jsx/staffGuestFlow.integration.test
// .jsx for the same pattern applied to Finance/Staff).
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

test("Mode invité -> Carrière -> Marketing -> Campagnes -> Canaux -> Prévisions -> Rapport, zero Supabase error at any step", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

  fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
  await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
  await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

  // Marketing (/marketing), through the top-bar's Marketing dropdown.
  fireEvent.click(screen.getByRole("button", { name: "Marketing" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "ROI" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Marketing" })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText("ROI marketing")).toBeInTheDocument());
  expectNoSupabaseError();

  // Campagnes (/marketing/campaigns).
  fireEvent.click(screen.getByRole("link", { name: /^campagnes$/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Campagnes" })).toBeInTheDocument());
  expectNoSupabaseError();

  // Canaux (/marketing/channels).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Marketing" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /^canaux$/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Canaux" })).toBeInTheDocument());
  expectNoSupabaseError();

  // Prévisions (/marketing/forecast).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Marketing" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /prévisions/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions marketing/i })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("tab", { name: "Réaliste" })).toBeInTheDocument());
  expectNoSupabaseError();

  // Rapport complet (/marketing/report).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Marketing" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /^rapport$/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /rapport marketing complet/i })).toBeInTheDocument());
  expectNoSupabaseError();
}, 15000);
