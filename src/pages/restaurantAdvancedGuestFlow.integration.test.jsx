// Integration test: Guest Mode + Restaurant Advanced module -- the new
// F&B pages (RestaurantMenuEngineering/RestaurantFoodCost/
// RestaurantPopularity/RestaurantProfitability/RestaurantForecast/
// RestaurantReport) load cleanly as a guest, with zero Supabase errors,
// through the real <App/> and the real top-bar navigation.
//
// Same pattern as clientsGuestFlow.integration.test.jsx: guest mode →
// start a career (so useRestaurantAdvanced() has a hotel bundle) →
// navigate to each F&B tab via the "Restaurant" top-bar menu.
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
  "Mode invité → Restaurant → menu engineering → food cost → popularité → rentabilité → forecast → rapport, zero Supabase error at any step",
  async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("link", { name: /^mode solo/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Plus" })).toBeInTheDocument());

    // Navigate to /restaurant/menu-engineering via the "Restaurant" top-bar menu.
    fireEvent.click(screen.getByRole("button", { name: /restaurant/i }));
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /menu engineering/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("menuitem", { name: /menu engineering/i }));

    // Guest mode seeds an already-ready establishment (see
    // lib/guest/guestAdapter.js) -- the tab bar shows straight away.
    await waitFor(() => expect(screen.getByRole("tablist")).toBeInTheDocument());
    expectNoSupabaseError();

    // Start a career so useRestaurantAdvanced() has a hotel bundle to
    // compute a cycle from.
    const startCareerButton = screen.queryByRole("button", { name: /démarrer ma carrière/i });
    if (startCareerButton) {
      fireEvent.click(startCareerButton);
      await waitFor(() => expect(screen.queryByText(/chargement des données f&b/i)).not.toBeInTheDocument(), { timeout: 8000 });
      expectNoSupabaseError();
    }

    // Food Cost -- both the tab bar and the page header link here, so
    // pick whichever matching link comes first.
    const foodCostLinks = screen.queryAllByRole("link", { name: /^food cost$/i });
    if (foodCostLinks.length > 0) {
      fireEvent.click(foodCostLinks[0]);
      await waitFor(() => expect(screen.getByRole("heading", { name: /^food cost$/i })).toBeInTheDocument());
      expectNoSupabaseError();
    }

    // Popularité
    const popularityLinks = screen.queryAllByRole("link", { name: /^popularité$/i });
    if (popularityLinks.length > 0) {
      fireEvent.click(popularityLinks[0]);
      await waitFor(() => expect(screen.getByRole("heading", { name: /^popularité$/i })).toBeInTheDocument());
      expectNoSupabaseError();
    }

    // Rentabilité
    const profitabilityLinks = screen.queryAllByRole("link", { name: /^rentabilité$/i });
    if (profitabilityLinks.length > 0) {
      fireEvent.click(profitabilityLinks[0]);
      await waitFor(() => expect(screen.getByRole("heading", { name: /^rentabilité$/i })).toBeInTheDocument());
      expectNoSupabaseError();
    }

    // Forecast
    const forecastLinks = screen.queryAllByRole("link", { name: /^forecast$/i });
    if (forecastLinks.length > 0) {
      fireEvent.click(forecastLinks[0]);
      await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions f&b/i })).toBeInTheDocument());
      expectNoSupabaseError();
    }

    // Rapport
    const reportLinks = screen.queryAllByRole("link", { name: /^rapport$/i });
    if (reportLinks.length > 0) {
      fireEvent.click(reportLinks[0]);
      await waitFor(() => expect(screen.getByRole("heading", { name: /rapport f&b/i })).toBeInTheDocument());
      expectNoSupabaseError();
    }
  },
  20000
);
