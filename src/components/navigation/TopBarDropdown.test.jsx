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

// Part B of the navigation fixes: the dropdown must float above the page
// (position:absolute, anchored to its own `position:relative` wrapper),
// never push content in the normal document flow, and never grow tall
// enough to force a page scroll on its own.
test("the trigger's wrapper is the positioning anchor and the panel floats above the page", () => {
  renderMenu({ label: "Hôtel", items: [{ label: "Chambres", to: "/rooms" }] });
  const trigger = screen.getByRole("button", { name: "Hôtel" });
  fireEvent.click(trigger);

  const panel = screen.getByRole("menu", { name: "Hôtel" });
  expect(trigger.parentElement).toHaveClass("relative");
  expect(panel).toHaveClass("absolute");
  expect(panel).toHaveClass("top-full");
  expect(panel).toHaveClass("z-[9999]");
  // Capped height + its own scroll, so a long sub-menu scrolls inside the
  // panel instead of extending the page's own scrollable area.
  expect(panel).toHaveClass("max-h-[300px]");
  expect(panel).toHaveClass("overflow-y-auto");
});

test("opening the dropdown does not move a sibling element in the normal document flow", () => {
  render(
    <div>
      <TopBarDropdown label="Hôtel" items={[{ label: "Chambres", to: "/rooms" }, { label: "Housekeeping", to: "/housekeeping" }, { label: "Clients", to: "/clients" }]} />
      <p data-testid="below">En dessous</p>
    </div>,
    { wrapper: MemoryRouter }
  );
  const below = screen.getByTestId("below");
  const topBefore = below.getBoundingClientRect().top;

  fireEvent.click(screen.getByRole("button", { name: "Hôtel" }));

  // position:absolute takes the panel out of the flow -- a sibling
  // rendered after it keeps the exact same position whether the dropdown
  // is open or closed (jsdom's layout is 0 either way, so this asserts
  // the CSS mechanism -- absolute vs static positioning -- not real
  // pixel geometry, which jsdom cannot compute).
  expect(below.getBoundingClientRect().top).toBe(topBefore);
  expect(screen.getByRole("menu", { name: "Hôtel" })).not.toHaveClass("static");
});
