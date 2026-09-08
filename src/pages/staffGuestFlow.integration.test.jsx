// Integration test: Guest Mode + Staff -- the refonted Staff pages
// (StaffDashboard/StaffReport/StaffForecast) load cleanly as a guest,
// with zero Supabase errors, through the real <App/> and the real
// top-bar navigation (see the Refonte RH request's section 7 and
// financeGuestFlow.integration.test.jsx for the same pattern applied to
// Finance).
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

test("Mode invité -> Carrière -> Staff -> Rapport -> Prévisions, zero Supabase error at any step", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /choisissez votre mode de jeu/i })).toBeInTheDocument());

  fireEvent.click(screen.getByRole("link", { name: /^carrière/i }));
  await waitFor(() => expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
  await waitFor(() => expect(screen.getByText(/vue globale/i)).toBeInTheDocument());

  // Staff (/staff), through the top-bar's Staff dropdown.
  fireEvent.click(screen.getByRole("button", { name: "Staff" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "RH" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Staff" })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText("Moral")).toBeInTheDocument());
  expectNoSupabaseError();

  // Rapport complet (/staff/report).
  fireEvent.click(screen.getByRole("link", { name: /rapport complet/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /rapport rh complet/i })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText(/Effectif total : /)).toBeInTheDocument());
  expectNoSupabaseError();

  // Prévisions (/staff/forecast).
  fireEvent.click(screen.getByRole("link", { name: /← retour/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Staff" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("link", { name: /prévisions/i }));
  await waitFor(() => expect(screen.getByRole("heading", { name: /prévisions rh/i })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("tab", { name: "Réaliste" })).toBeInTheDocument());
  expectNoSupabaseError();
}, 15000);
