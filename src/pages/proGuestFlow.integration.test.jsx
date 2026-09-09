// Integration test: Guest Mode + Mode Professionnel Solo -- the new Pro
// pages (ProMenu/ProDashboard/ProCrises/ProOpportunities/ProAudits/
// ProObjectives/ProForecast/ProReport) load cleanly as a guest, with
// zero Supabase errors, through the real <App/> and the real top-bar
// navigation. Same pattern as tfeGuestFlow.integration.test.jsx: Pro is
// a self-contained 24-month run (see lib/pro/proState.js) so this flow
// never starts the regular Carrière first.
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

test(
  "Mode invité → Mode Professionnel → créer le programme → jouer un mois → crises → opportunités → audits → objectifs → prévisions → rapport, zero Supabase error at any step",
  async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

    // Land on any in-game page first -- the top bar only renders once
    // past the full-bleed pre-game screens.
    fireEvent.click(screen.getByRole("link", { name: /^mode solo/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /mode professionnel/i })).toBeInTheDocument());

    // /pro, through the top-bar's "Mode Professionnel" dropdown.
    fireEvent.click(screen.getByRole("button", { name: /mode professionnel/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /nouveau programme/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /créer votre programme professionnel/i })).toBeInTheDocument());
    expectNoSupabaseError();

    fireEvent.click(screen.getByText("Établissement moyen (30 chambres)"));
    fireEvent.click(screen.getByRole("button", { name: /commencer le mode professionnel/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /tableau de bord professionnel/i })).toBeInTheDocument());
    expectNoSupabaseError();

    // Play a month from the Pro dashboard.
    fireEvent.click(screen.getByRole("button", { name: /mois suivant/i }));
    await waitFor(() => expect(screen.getByText(/mois 1\s*\/\s*24/i)).toBeInTheDocument());
    expectNoSupabaseError();

    // Crises (/pro/crises). The page's own <h1> reads "Crises" in both
    // the "no program" and loaded states, so wait for the "← Tableau de
    // bord" back link -- only rendered once the real proState has
    // loaded -- rather than the heading alone.
    fireEvent.click(screen.getByRole("link", { name: /^crises$/i }));
    await waitFor(() => expect(screen.getByRole("link", { name: /tableau de bord/i })).toBeInTheDocument());
    expectNoSupabaseError();

    // Opportunités (/pro/opportunities).
    fireEvent.click(screen.getByRole("link", { name: /tableau de bord/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /mois suivant/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("link", { name: /opportunités/i }));
    await waitFor(() => expect(screen.getByRole("link", { name: /tableau de bord/i })).toBeInTheDocument());
    expectNoSupabaseError();

    // Audits (/pro/audits).
    fireEvent.click(screen.getByRole("link", { name: /tableau de bord/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /mois suivant/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("link", { name: /^audits$/i }));
    await waitFor(() => expect(screen.getByRole("link", { name: /tableau de bord/i })).toBeInTheDocument());
    expectNoSupabaseError();

    // Objectifs (/pro/objectives).
    fireEvent.click(screen.getByRole("link", { name: /tableau de bord/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /mois suivant/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("link", { name: /^objectifs$/i }));
    await waitFor(() => expect(screen.getByRole("link", { name: /tableau de bord/i })).toBeInTheDocument());
    expectNoSupabaseError();

    // Prévisions (/pro/forecast).
    fireEvent.click(screen.getByRole("link", { name: /tableau de bord/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /mois suivant/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("link", { name: /prévisions/i }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Réaliste" })).toBeInTheDocument());
    expectNoSupabaseError();

    // Rapport (/pro/report). The page's own <h1> reads "Rapport final
    // professionnel" in both the "no data" and loaded states, so wait
    // for the "Exporter en HTML" button to become enabled instead.
    fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /mois suivant/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("link", { name: /^rapport$/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /exporter en html/i })).toBeEnabled());
    expectNoSupabaseError();
  },
  20000
);
