// Integration test: Guest Mode + ESG -- the refonted ESG pages
// (EsgDashboard/EsgCertifications/EsgForecast/EsgReport) load cleanly as
// a guest, with zero Supabase errors, through the real <App/> and the
// real top-bar navigation (see the Refonte ESG request's section 7 and
// financeGuestFlow.integration.test.jsx/staffGuestFlow.integration.test
// .jsx/marketingGuestFlow.integration.test.jsx for the same pattern
// applied to Finance/Staff/Marketing).
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

test("Mode invité -> Carrière -> ESG -> Certifications -> Prévisions -> Rapport, zero Supabase error at any step", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

  fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
  await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
  await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

  // ESG (/esg), through the top-bar's ESG dropdown.
  fireEvent.click(screen.getByRole("button", { name: "ESG" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Énergie" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "ESG" })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText("Score ESG")).toBeInTheDocument());
  expectNoSupabaseError();

  // Certifications (/esg/certifications).
  fireEvent.click(screen.getByRole("link", { name: /certifications/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Certifications" })).toBeInTheDocument());
  expectNoSupabaseError();

  // Prévisions (/esg/forecast).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "ESG" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /prévisions/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions esg/i })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("tab", { name: "Réaliste" })).toBeInTheDocument());
  expectNoSupabaseError();

  // Rapport complet (/esg/report).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "ESG" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /^rapport$/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /rapport esg complet/i })).toBeInTheDocument());
  expectNoSupabaseError();
}, 15000);
