// Integration test: Guest Mode + TFE Solo -- the refonted TFE pages
// (TfeMenu/TfeDashboard/TfeStoryline/TfeForecast/TfeReport) load cleanly
// as a guest, with zero Supabase errors, through the real <App/> and the
// real top-bar navigation (see the Mode TFE Solo request's section 7 and
// financeGuestFlow.integration.test.jsx/staffGuestFlow.integration.test
// .jsx/marketingGuestFlow.integration.test.jsx/esgGuestFlow.integration
// .test.jsx/housekeepingGuestFlow.integration.test.jsx for the same
// pattern applied to Finance/Staff/Marketing/ESG/Housekeeping). Unlike
// those, TFE is a self-contained 36-month run (see lib/tfe/tfeState.js)
// so this flow never starts the regular Carrière first.
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

test("Mode invité -> Plus -> Mode TFE Solo -> créer l'établissement -> jouer un mois -> storyline -> prévisions -> rapport, zero Supabase error at any step", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

  // Land on any in-game page first -- the top bar (and its "Plus"
  // dropdown) only renders once past the full-bleed pre-game screens
  // (see layout/Layout.jsx's FULL_BLEED_ROUTES).
  fireEvent.click(screen.getByRole("link", { name: /^mode solo/i }));

  // Mode TFE Solo (/tfe), through the top-bar's "Plus" dropdown.
  await waitFor(() => expect(screen.getByRole("button", { name: "Plus" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Plus" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Mode TFE Solo" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /créer votre établissement/i })).toBeInTheDocument());
  expectNoSupabaseError();

  fireEvent.click(screen.getByText("Établissement moyen (30 chambres)"));
  fireEvent.click(screen.getByRole("button", { name: /commencer le tfe/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /tableau de bord tfe/i })).toBeInTheDocument());
  expectNoSupabaseError();

  // Play a month from the TFE dashboard.
  fireEvent.click(screen.getByRole("button", { name: /mois suivant/i }));
  await waitFor(() => expect(screen.getByText(/mois 1\s*\/\s*36/i)).toBeInTheDocument());
  expectNoSupabaseError();

  // Storyline (/tfe/storyline).
  fireEvent.click(screen.getByRole("link", { name: /storyline/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /storyline/i })).toBeInTheDocument());
  expectNoSupabaseError();

  // Prévisions (/tfe/forecast).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /tableau de bord tfe/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /prévisions/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions tfe/i })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("tab", { name: "Réaliste" })).toBeInTheDocument());
  expectNoSupabaseError();

  // Rapport (/tfe/report).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /tableau de bord tfe/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /^rapport$/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /rapport final tfe/i })).toBeInTheDocument());
  expectNoSupabaseError();
}, 20000);
