// Integration test: the GM Desk through the real daily loop -- guest
// mode, MorningBriefing -> MyHotel -> a message is generated from real
// business diagnostics -> GM Desk -> a decision is applied -> visual
// feedback -> DailyReview shows it in "Messages reçus aujourd'hui" -- with
// zero Supabase errors anywhere. Same pattern as
// pages/dailyLoopGuestFlow.integration.test.jsx and
// ui/hotelView/v2/hotelView2D.integration.test.jsx.
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
  "Mode invité → Carrière → MyHotel → message généré → GM Desk → décision → feedback visuel → DailyReview",
  async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
    expectNoSupabaseError();

    fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
    await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

    // MyHotel: the "📬 GM Desk" link is there, with an unread-style badge
    // once real business diagnostics have produced at least one message.
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /mon hôtel/i })).toBeInTheDocument());
    expectNoSupabaseError();
    const gmDeskLinks = screen.getAllByRole("link", { name: /gm desk/i });
    gmDeskLinks.forEach((link) => expect(link).toHaveAttribute("href", "/gm-desk"));

    // Open the GM Desk (through MyHotel's own "📬 GM Desk" link).
    fireEvent.click(gmDeskLinks[gmDeskLinks.length - 1]);
    await waitFor(() => expect(screen.getByRole("heading", { name: /la voix de l'hôtel/i })).toBeInTheDocument());
    expectNoSupabaseError();

    // Open the first message and apply its first decision.
    const inbox = screen.getByRole("list", { name: "Messages" });
    const firstMessageButton = inbox.querySelector("li button");
    expect(firstMessageButton).toBeTruthy();
    fireEvent.click(firstMessageButton);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    const firstRadio = screen.getByRole("dialog").querySelector('input[type="radio"]');
    fireEvent.click(firstRadio);
    fireEvent.click(screen.getByRole("button", { name: /^appliquer$/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /appliqué/i })).toBeInTheDocument());
    expectNoSupabaseError();

    // Back to MyHotel, play the day, and DailyReview shows today's
    // messages with a link back to the GM Desk.
    fireEvent.click(screen.getByRole("link", { name: /← retour à l'hôtel/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /jouer la journée/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /jouer la journée/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /que s'est-il passé/i })).toBeInTheDocument());
    expectNoSupabaseError();
    expect(screen.getByRole("heading", { name: /messages reçus aujourd'hui/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voir tous les messages/i })).toHaveAttribute("href", "/gm-desk");
  },
  20000
);
