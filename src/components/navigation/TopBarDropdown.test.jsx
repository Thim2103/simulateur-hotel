import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TopBarDropdown from "./TopBarDropdown";

function renderMenu(props) {
  return render(<TopBarDropdown {...props} />, { wrapper: MemoryRouter });
}

test("renders a plain link when there are no items", () => {
  renderMenu({ label: "Dashboard", to: "/" });
  const link = screen.getByRole("link", { name: "Dashboard" });
  expect(link).toHaveAttribute("href", "/");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("the dropdown menu starts closed", () => {
  renderMenu({ label: "Hôtel", items: [{ label: "Chambres", to: "/rooms" }] });
  expect(screen.getByRole("button", { name: "Hôtel" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("menu", { hidden: true })).not.toBeVisible();
});

test("clicking the trigger opens the dropdown and shows its items", () => {
  renderMenu({ label: "Hôtel", items: [{ label: "Chambres", to: "/rooms" }, { label: "Clients", to: "/clients" }] });

  fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));

  expect(screen.getByRole("button", { name: "Hôtel" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("menuitem", { name: "Chambres" })).toHaveAttribute("href", "/rooms");
  expect(screen.getByRole("menuitem", { name: "Clients" })).toHaveAttribute("href", "/clients");
});

test("clicking the trigger again closes the dropdown", () => {
  renderMenu({ label: "Hôtel", items: [{ label: "Chambres", to: "/rooms" }] });
  const trigger = screen.getByRole("button", { name: "Hôtel" });

  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("clicking outside the dropdown closes it", () => {
  render(
    <div>
      <TopBarDropdown label="Hôtel" items={[{ label: "Chambres", to: "/rooms" }]} />
      <button type="button">Ailleurs</button>
    </div>,
    { wrapper: MemoryRouter }
  );

  fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));
  expect(screen.getByRole("button", { name: "Hôtel" })).toHaveAttribute("aria-expanded", "true");

  fireEvent.mouseDown(screen.getByRole("button", { name: "Ailleurs" }));
  expect(screen.getByRole("button", { name: "Hôtel" })).toHaveAttribute("aria-expanded", "false");
});

test("pressing Escape closes the dropdown", () => {
  renderMenu({ label: "Hôtel", items: [{ label: "Chambres", to: "/rooms" }] });
  fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.getByRole("button", { name: "Hôtel" })).toHaveAttribute("aria-expanded", "false");
});

test("clicking an item closes the dropdown", () => {
  renderMenu({ label: "Hôtel", items: [{ label: "Chambres", to: "/rooms" }] });
  fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));

  fireEvent.click(screen.getByRole("menuitem", { name: "Chambres" }));
  expect(screen.getByRole("button", { name: "Hôtel" })).toHaveAttribute("aria-expanded", "false");
});

test("aligns the dropdown to the right when align='right' is passed", () => {
  renderMenu({ label: "ESG", items: [{ label: "Énergie", to: "/esg" }], align: "right" });
  fireEvent.click(screen.getByRole("button", { name: "ESG" }));
  expect(screen.getByRole("menu", { name: "ESG" })).toHaveClass("right-0");
});
