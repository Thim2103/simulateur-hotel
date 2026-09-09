// Integration test: the redesigned daily loop (Morning Briefing -> MyHotel
// -> Decisions -> "Jouer la journée" -> DailyReview), played as a guest,
// through the real <App/> and the real top-bar navigation, with zero
// Supabase errors. See pages/MorningBriefing.jsx, pages/Dashboard.jsx
// (MyHotel), pages/DailyReview.jsx.
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
  "Mode invité → Carrière → MyHotel → Briefing du matin → Décisions du jour → Jouer la journée → DailyReview, zero Supabase error",
  async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
    expectNoSupabaseError();

    fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
    await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());
    expectNoSupabaseError();

    // MyHotel (/dashboard), through the top-bar's own "Dashboard" link.
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /mon hôtel/i })).toBeInTheDocument());
    expectNoSupabaseError();

    // MyHotel: hotel view (retro-modern isometric by default, see
    // RetroView.jsx), attention panel, décisions du jour.
    expect(screen.getByText(/vue isométrique rétro de l'hôtel/i)).toBeInTheDocument();
    expect(screen.getByText(/ce qui demande votre attention/i)).toBeInTheDocument();
    expect(screen.getByText(/décisions du jour/i)).toBeInTheDocument();

    // Morning Briefing, through the top-bar's "Hôtel" dropdown.
    fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /briefing du matin/i }));
    await waitFor(() => expect(screen.getByText(/situation/i)).toBeInTheDocument());
    expectNoSupabaseError();
    expect(screen.getByRole("link", { name: /aller à l'hôtel/i })).toHaveAttribute("href", "/dashboard");

    // Back to MyHotel, then "Jouer la journée" -> DailyReview.
    fireEvent.click(screen.getByRole("link", { name: /aller à l'hôtel/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /jouer la journée/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /jouer la journée/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /que s'est-il passé/i })).toBeInTheDocument());
    expectNoSupabaseError();
    expect(screen.getByText(/résumé/i)).toBeInTheDocument();
    expect(screen.getByText(/pourquoi/i)).toBeInTheDocument();
  },
  20000
);
