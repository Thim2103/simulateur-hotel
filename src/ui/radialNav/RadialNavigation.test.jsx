import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RadialNavigation from "./RadialNavigation";
import { openRadialNav } from "./radialNavBus";

function renderNav() {
  return render(<RadialNavigation />, { wrapper: MemoryRouter });
}

test("starts closed, showing only the floating trigger", () => {
  renderNav();
  expect(screen.getByRole("button", { name: /ouvrir la navigation radiale/i })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("clicking the trigger opens the hub and all 7 branches", () => {
  renderNav();
  fireEvent.click(screen.getByRole("button", { name: /ouvrir la navigation radiale/i }));

  expect(screen.getByRole("dialog", { name: /navigation radiale/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /mon hôtel/i })).toBeInTheDocument();
  ["Clients", "Personnel", "Business", "Marketing", "Services", "ESG", "Développement"].forEach((label) => {
    expect(screen.getByRole("link", { name: new RegExp(label, "i") })).toBeInTheDocument();
  });
});

test("pressing Escape closes the overlay", () => {
  renderNav();
  fireEvent.click(screen.getByRole("button", { name: /ouvrir la navigation radiale/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("the close button closes the overlay", () => {
  renderNav();
  fireEvent.click(screen.getByRole("button", { name: /ouvrir la navigation radiale/i }));
  fireEvent.click(screen.getByRole("button", { name: /fermer la navigation radiale/i }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("selecting a branch closes the overlay", () => {
  renderNav();
  fireEvent.click(screen.getByRole("button", { name: /ouvrir la navigation radiale/i }));
  fireEvent.click(screen.getByRole("link", { name: /clients/i }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("openRadialNav() from radialNavBus.js opens this same instance", () => {
  renderNav();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  act(() => openRadialNav());
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
