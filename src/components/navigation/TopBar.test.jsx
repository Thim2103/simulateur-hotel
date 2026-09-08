import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TopBar from "./TopBar";

function renderTopBar() {
  return render(<TopBar />, { wrapper: MemoryRouter });
}

test("renders the game's name linking home", () => {
  renderTopBar();
  expect(screen.getByRole("link", { name: "Hospitality Lab" })).toHaveAttribute("href", "/");
});

test("renders every primary menu from the spec", () => {
  renderTopBar();
  ["Dashboard", "Hôtel", "Restaurant", "RM", "PMS", "Finance", "Marketing", "Staff", "ESG"].forEach((label) => {
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });
});

// "/" is now the app's landing redirect to the Menu Principal (see
// App.js) -- the top-bar's own "Dashboard" entry points at the in-game
// home page's real route instead.
test("the 'Dashboard' entry links to /dashboard, not /", () => {
  renderTopBar();
  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
});

test("Hôtel's dropdown opens with Chambres/Housekeeping/Clients", () => {
  renderTopBar();
  fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));
  expect(screen.getByRole("menuitem", { name: "Chambres" })).toHaveAttribute("href", "/rooms");
  expect(screen.getByRole("menuitem", { name: "Housekeeping" })).toHaveAttribute("href", "/housekeeping");
  expect(screen.getByRole("menuitem", { name: "Clients" })).toHaveAttribute("href", "/clients");
});

test("Restaurant's dropdown links into the nested /restaurant/* routes", () => {
  renderTopBar();
  fireEvent.click(screen.getByRole("button", { name: "Restaurant" }));
  expect(screen.getByRole("menuitem", { name: "Menu" })).toHaveAttribute("href", "/restaurant/menu");
  expect(screen.getByRole("menuitem", { name: "Opérations" })).toHaveAttribute("href", "/restaurant/operations");
});

test("the 'Plus' menu keeps Career/Guest/Chain reachable", () => {
  renderTopBar();
  fireEvent.click(screen.getByRole("button", { name: "Plus" }));
  expect(screen.getByRole("menuitem", { name: "Mode Carrière" })).toHaveAttribute("href", "/career");
  expect(screen.getByRole("menuitem", { name: "Mode Invité" })).toHaveAttribute("href", "/guest");
  expect(screen.getByRole("menuitem", { name: "Chaîne d'hôtels" })).toHaveAttribute("href", "/chain");
});

test("the mobile menu toggle shows every menu stacked", () => {
  renderTopBar();
  fireEvent.click(screen.getByRole("button", { name: /ouvrir la navigation/i }));
  expect(screen.getByRole("navigation", { name: /mobile/i })).toBeInTheDocument();
  expect(screen.getAllByText("Chambres").length).toBeGreaterThan(0);
});

// Part B of the navigation fixes: opening every desktop dropdown (even
// the ones with the most items, Restaurant/Finance/ESG) must never grow
// the page's own scrollable area -- each panel floats and caps its own
// height instead (see TopBarDropdown.test.jsx's positioning tests for the
// per-dropdown mechanism; this checks it holds across the whole bar).
test("opening every dropdown in turn never grows the document's scroll height", () => {
  renderTopBar();
  const heightBefore = document.documentElement.scrollHeight;

  ["Hôtel", "Restaurant", "RM", "PMS", "Finance", "Marketing", "Staff", "ESG", "Plus"].forEach((label) => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  });

  expect(document.documentElement.scrollHeight).toBe(heightBefore);
});

// The header row itself must not become its own scroll container either
// (see TopBar.jsx's docstring on why overflow-x-hidden was removed from
// it) -- every dropdown panel stays reachable without scrolling.
test("the top-bar's own row does not clip or scroll its dropdown panels", () => {
  renderTopBar();
  fireEvent.click(screen.getByRole("button", { name: "ESG" }));
  const panel = screen.getByRole("menu", { name: "ESG" });
  const row = panel.closest("nav").parentElement;

  expect(row.className).not.toMatch(/overflow-x-hidden/);
  expect(panel).toBeVisible();
});
