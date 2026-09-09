// Integration test: IsoFinalView (the "Retro-Moderne Premium" isometric
// view, per the Bible Artistique) through the real daily loop -- guest
// mode, MorningBriefing -> MyHotel (premium isometric by default) ->
// décisions -> DailyReview -- with zero Supabase errors anywhere. Same
// pattern as pages/dailyLoopGuestFlow.integration.test.jsx and every
// earlier hotel view's own integration test.
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
  "Mode invité → Carrière → MorningBriefing → MyHotel (isométrique premium) → décisions → DailyReview",
  async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
    expectNoSupabaseError();

    fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
    await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

    // MyHotel: the premium isometric view is the default (IsoFinalView),
    // with all 6 ground-floor rooms the Bible asks for.
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /mon hôtel/i })).toBeInTheDocument());
    expectNoSupabaseError();
    expect(screen.getByText(/vue isométrique premium de l'hôtel/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vue 2d/i })).toBeInTheDocument();

    // Morning Briefing.
    fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /briefing du matin/i }));
    await waitFor(() => expect(screen.getByText(/situation/i)).toBeInTheDocument());
    expectNoSupabaseError();

    // Back to MyHotel, apply a decision -- stays on the premium view.
    fireEvent.click(screen.getByRole("link", { name: /aller à l'hôtel/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /avancer la journée/i })).toBeInTheDocument());
    expect(screen.getByText(/vue isométrique premium de l'hôtel/i)).toBeInTheDocument();

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
