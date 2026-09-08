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
