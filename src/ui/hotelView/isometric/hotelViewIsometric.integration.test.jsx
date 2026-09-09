// Integration test: HotelViewIsometric (v3) through the real daily loop --
// guest mode, MorningBriefing -> MyHotel (isometric by default) ->
// décisions -> animations iso -> DailyReview -- with zero Supabase errors
// anywhere. Same pattern as pages/dailyLoopGuestFlow.integration.test.jsx
// and ui/hotelView/v2/hotelView2D.integration.test.jsx.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../../App";

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
  "Mode invité → Carrière → MorningBriefing → MyHotel (isométrique) → décisions → animations iso → DailyReview",
  async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
    expectNoSupabaseError();

    fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
    await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

    // MyHotel: the isometric view is the default (HotelViewIsometric, v3).
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /mon hôtel/i })).toBeInTheDocument());
    expectNoSupabaseError();
    expect(screen.getByText(/vue isométrique de l'hôtel/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vue 2d/i })).toBeInTheDocument();

    // Morning Briefing.
    fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /briefing du matin/i }));
    await waitFor(() => expect(screen.getByText(/situation/i)).toBeInTheDocument());
    expectNoSupabaseError();

    // Back to MyHotel, apply a decision -- the isometric stage keeps
    // showing zero Supabase errors and stays on the isometric view.
    fireEvent.click(screen.getByRole("link", { name: /aller à l'hôtel/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /avancer la journée/i })).toBeInTheDocument());
    expect(screen.getByText(/vue isométrique de l'hôtel/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
    expectNoSupabaseError();

    // "Avancer la journée" -> DailyReview.
    await waitFor(() => expect(screen.getByRole("button", { name: /avancer la journée/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /avancer la journée/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /que s'est-il passé/i })).toBeInTheDocument());
    expectNoSupabaseError();
  },
  20000
);
