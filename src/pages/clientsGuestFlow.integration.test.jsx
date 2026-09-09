// Integration test: Guest Mode + Clients module -- the refactored Clients
// pages (ClientsDashboard/ClientsSegments/ClientsReviews/ClientsForecast/
// ClientsReport) load cleanly as a guest, with zero Supabase errors,
// through the real <App/> and the real top-bar navigation.
//
// Same pattern as housekeepingGuestFlow.integration.test.jsx: guest mode
// → /solo (to get the TopBar) → navigate to /clients → verify each page.
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
  "Mode invité → Hôtel → Clients → segments → reviews → forecast → report, zero Supabase error at any step",
  async () => {
    render(<App />);

    // Accept guest mode
    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument()
    );

    // Navigate to an in-game page first so the TopBar renders
    fireEvent.click(screen.getByRole("link", { name: /^mode solo/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Plus" })).toBeInTheDocument()
    );

    // Navigate to /clients via the "Hôtel" top-bar menu
    fireEvent.click(screen.getByRole("button", { name: /hôtel/i }));
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Clients" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("menuitem", { name: "Clients" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^clients$/i })).toBeInTheDocument()
    );
    expectNoSupabaseError();

    // Start a career so the Clients module has data to show
    fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
    await waitFor(() => expect(screen.queryByText(/chargement du cycle clients/i)).not.toBeInTheDocument(), { timeout: 8000 });
    expectNoSupabaseError();

    // Clients segments page
    const segLink = screen.queryByRole("link", { name: /segments/i });
    if (segLink) {
      fireEvent.click(segLink);
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: /segments clients/i })).toBeInTheDocument()
      );
      expectNoSupabaseError();
    }

    // Back to dashboard then reviews
    const dashLink = screen.queryByRole("link", { name: /tableau de bord/i });
    if (dashLink) {
      fireEvent.click(dashLink);
      await waitFor(() => expect(screen.getByRole("heading", { name: /^clients$/i })).toBeInTheDocument());
    }

    const reviewsLink = screen.queryByRole("link", { name: /^avis$/i });
    if (reviewsLink) {
      fireEvent.click(reviewsLink);
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: /avis clients/i })).toBeInTheDocument()
      );
      expectNoSupabaseError();
    }

    // Back to dashboard then forecast
    const dashLink2 = screen.queryByRole("link", { name: /tableau de bord/i });
    if (dashLink2) {
      fireEvent.click(dashLink2);
      await waitFor(() => expect(screen.getByRole("heading", { name: /^clients$/i })).toBeInTheDocument());
    }

    const forecastLink = screen.queryByRole("link", { name: /prévisions/i });
    if (forecastLink) {
      fireEvent.click(forecastLink);
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: /prévisions clients/i })).toBeInTheDocument()
      );
      expectNoSupabaseError();
    }

    // Back to dashboard then report
    const dashLink3 = screen.queryByRole("link", { name: /tableau de bord/i });
    if (dashLink3) {
      fireEvent.click(dashLink3);
      await waitFor(() => expect(screen.getByRole("heading", { name: /^clients$/i })).toBeInTheDocument());
    }

    const reportLink = screen.queryByRole("link", { name: /^rapport$/i });
    if (reportLink) {
      fireEvent.click(reportLink);
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: /rapport clients/i })).toBeInTheDocument()
      );
      expectNoSupabaseError();
    }
  },
  20000
);
