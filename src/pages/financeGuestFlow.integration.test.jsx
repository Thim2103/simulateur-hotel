// Integration test: Guest Mode + Finance -- the refonted Finance pages
// (FinanceDashboard/FinanceReport/FinanceForecast) load cleanly as a
// guest, with zero Supabase errors, through the real <App/> and the real
// top-bar navigation (see the Refonte Finance request's section 7 and
// navigationTopBarGuestFlow.integration.test.jsx for the same pattern
// applied to the rest of the app).
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

test("Mode invité -> Carrière -> Finance -> Rapport -> Prévisions, zero Supabase error at any step", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

  fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
  await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
  await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

  // Finance (/finance), through the top-bar's Finance dropdown.
  fireEvent.click(screen.getByRole("button", { name: "Finance" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Revenus" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Finance" })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText("GOP")).toBeInTheDocument());
  expectNoSupabaseError();

  // Rapport complet (/finance/report).
  fireEvent.click(screen.getByRole("link", { name: /rapport complet/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /rapport financier complet/i })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText(/GOP : /)).toBeInTheDocument());
  expectNoSupabaseError();

  // Prévisions (/finance/forecast).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Finance" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /prévisions/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions financières/i })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("tab", { name: "Réaliste" })).toBeInTheDocument());
  expectNoSupabaseError();
}, 15000);
