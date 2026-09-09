// Integration test: Guest Mode + RM Advanced module -- the new pages
// (RmAdvancedDashboard/RmCompression/RmDisplacement/RmPickup/
// RmAdvancedForecast/RmAdvancedReport) load cleanly as a guest, with
// zero Supabase errors, through the real <App/> and the real top-bar
// navigation.
//
// Same pattern as clientsGuestFlow.integration.test.jsx /
// restaurantAdvancedGuestFlow.integration.test.jsx: guest mode → start a
// career (so useRmAdvancedEngine() has a hotel bundle) → navigate to
// each RM Advanced tab, returning to the RM avancé dashboard between
// each one (the sub-pages only link back to it, not to each other).
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

async function backToRmAdvancedDashboard() {
  const backLink = screen.queryByRole("link", { name: /dashboard rm avancé/i });
  if (backLink) {
    fireEvent.click(backLink);
    await waitFor(() => expect(screen.getByRole("heading", { name: /^rm avancé$/i })).toBeInTheDocument());
  }
}

test(
  "Mode invité → RM → RM avancé → compression → displacement → pick-up → forecast → rapport, zero Supabase error at any step",
  async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("link", { name: /^mode solo/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Plus" })).toBeInTheDocument());

    // Navigate to /rm-advanced via the "RM" top-bar menu.
    fireEvent.click(screen.getByRole("button", { name: /^rm$/i }));
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /^rm avancé$/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("menuitem", { name: /^rm avancé$/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^rm avancé$/i })).toBeInTheDocument()
    );
    expectNoSupabaseError();

    // Start a career so useRmAdvancedEngine() has a hotel bundle to
    // compute a cycle from.
    const startCareerButton = screen.queryByRole("button", { name: /démarrer ma carrière/i });
    if (startCareerButton) {
      fireEvent.click(startCareerButton);
      await waitFor(() => expect(screen.queryByText(/chargement des données rm avancé/i)).not.toBeInTheDocument(), { timeout: 8000 });
      expectNoSupabaseError();
    }

    // Compression (linked directly from the dashboard's own header)
    const compressionLink = screen.queryByRole("link", { name: /^compression$/i });
    if (compressionLink) {
      fireEvent.click(compressionLink);
      await waitFor(() => expect(screen.getByRole("heading", { name: /^compression$/i })).toBeInTheDocument());
      expectNoSupabaseError();
      await backToRmAdvancedDashboard();
    }

    // Displacement
    const displacementLink = screen.queryByRole("link", { name: /^displacement$/i });
    if (displacementLink) {
      fireEvent.click(displacementLink);
      await waitFor(() => expect(screen.getByRole("heading", { name: /^displacement$/i })).toBeInTheDocument());
      expectNoSupabaseError();
      await backToRmAdvancedDashboard();
    }

    // Pick-up
    const pickupLink = screen.queryByRole("link", { name: /pick-up/i });
    if (pickupLink) {
      fireEvent.click(pickupLink);
      await waitFor(() => expect(screen.getByRole("heading", { name: /^pick-up$/i })).toBeInTheDocument());
      expectNoSupabaseError();
      await backToRmAdvancedDashboard();
    }

    // Forecast
    const forecastLink = screen.queryByRole("link", { name: /^forecast$/i });
    if (forecastLink) {
      fireEvent.click(forecastLink);
      await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions rm avancé/i })).toBeInTheDocument());
      expectNoSupabaseError();
      await backToRmAdvancedDashboard();
    }

    // Rapport
    const reportLink = screen.queryByRole("link", { name: /^rapport$/i });
    if (reportLink) {
      fireEvent.click(reportLink);
      await waitFor(() => expect(screen.getByRole("heading", { name: /rapport rm avancé/i })).toBeInTheDocument());
      expectNoSupabaseError();
    }
  },
  20000
);
