// Integration test: the Radial Navigation through the real daily loop --
// guest mode, MyHotel -> open the radial menu -> a branch -> GM Desk's own
// "Retour à la navigation" -> back to the hub -> zero Supabase errors
// anywhere. Same pattern as pages/dailyLoopGuestFlow.integration.test.jsx,
// ui/hotelView/v2/hotelView2D.integration.test.jsx and
// ui/gmDesk/gmDesk.integration.test.jsx.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../App";

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
  "Mode invité → Carrière → MyHotel → Radial Navigation → module → GM Desk → retour à la navigation → hub",
  async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
    expectNoSupabaseError();

    fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
    await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

    // MyHotel.
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /mon hôtel/i })).toBeInTheDocument());
    expectNoSupabaseError();

    // Open the Radial Navigation from MyHotel's own button.
    fireEvent.click(screen.getByRole("button", { name: /^🎯 radial navigation$/i }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: /navigation radiale/i })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /mon hôtel/i })).toBeInTheDocument();

    // Select a branch -- lands on its real page, overlay closes.
    fireEvent.click(screen.getByRole("link", { name: /^personnel$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expectNoSupabaseError();

    // Back to MyHotel, open the GM Desk, then use its own "Retour à la
    // navigation" to reopen the radial hub from there too.
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await waitFor(() => expect(screen.getAllByRole("link", { name: /gm desk/i }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("link", { name: /gm desk/i })[0]);
    await waitFor(() => expect(screen.getByRole("heading", { name: /la voix de l'hôtel/i })).toBeInTheDocument());
    expectNoSupabaseError();

    fireEvent.click(screen.getByRole("button", { name: /retour à la navigation/i }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: /navigation radiale/i })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /mon hôtel/i })).toBeInTheDocument();

    // The hub itself always leads back to MyHotel.
    fireEvent.click(screen.getByRole("link", { name: /mon hôtel/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /mon hôtel/i })).toBeInTheDocument());
    expectNoSupabaseError();
  },
  20000
);
