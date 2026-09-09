// Integration test: HotelView2D v2 through the real daily loop -- guest
// mode, MorningBriefing -> MyHotel (HotelView2DAnimated) -> a decision ->
// its visual feedback -> "Avancer la journée" -> DailyReview -- with zero
// Supabase errors anywhere. Same pattern as
// pages/dailyLoopGuestFlow.integration.test.jsx, extended to assert on
// HotelView2D v2's own content (the animated hotel, the timeline, the
// decision's feedback badge) instead of just the surrounding page chrome.
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
  "Mode invité → Carrière → MyHotel (HotelView2D v2) → Briefing du matin → décision → feedback visuel → Avancer la journée → DailyReview",
  async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
    expectNoSupabaseError();

    fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
    await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

    // MyHotel (/dashboard) -- the animated HotelView2D v2: timeline,
    // "Vue de l'hôtel", ground floor blocks.
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /avancer la journée/i })).toBeInTheDocument());
    expectNoSupabaseError();
    expect(screen.getByRole("heading", { name: /mon hôtel/i })).toBeInTheDocument();
    expect(screen.getByText(/vue de l'hôtel/i)).toBeInTheDocument();
    expect(screen.getByText("Réception")).toBeInTheDocument();

    // Morning Briefing, through the top-bar's "Hôtel" dropdown.
    fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /briefing du matin/i }));
    await waitFor(() => expect(screen.getByText(/situation/i)).toBeInTheDocument());
    expectNoSupabaseError();

    // Back to MyHotel, apply a decision -- its visual feedback (a
    // transient event badge on the hotel) should appear.
    fireEvent.click(screen.getByRole("link", { name: /aller à l'hôtel/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /avancer la journée/i })).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
    await waitFor(() => expect(screen.getByText(/décision :/i)).toBeInTheDocument());
    expectNoSupabaseError();

    // "Avancer la journée" (HotelTimeline's own button, replacing the
    // header's "Jouer la journée" as the primary way to close the day) ->
    // DailyReview.
    fireEvent.click(screen.getByRole("button", { name: /avancer la journée/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /que s'est-il passé/i })).toBeInTheDocument());
    expectNoSupabaseError();
  },
  20000
);
