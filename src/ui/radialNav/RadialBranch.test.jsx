import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RadialBranch from "./RadialBranch";

const branch = { id: "clients", icon: "clients", label: "Clients", route: "/clients" };

test("shows the branch's icon and label, linking to its route", () => {
  render(<RadialBranch branch={branch} x={0} y={-140} index={0} onNavigate={jest.fn()} />, { wrapper: MemoryRouter });
  const link = screen.getByRole("link", { name: /clients/i });
  expect(link).toHaveAttribute("href", "/clients");
});

test("positions itself via CSS custom properties derived from x/y", () => {
  render(<RadialBranch branch={branch} x={42} y={-99} index={2} onNavigate={jest.fn()} />, { wrapper: MemoryRouter });
  const link = screen.getByRole("link", { name: /clients/i });
  expect(link.style.getPropertyValue("--rn-x")).toBe("42px");
  expect(link.style.getPropertyValue("--rn-y")).toBe("-99px");
});

test("calls onNavigate when clicked", () => {
  const onNavigate = jest.fn();
  render(<RadialBranch branch={branch} x={0} y={-140} index={0} onNavigate={onNavigate} />, { wrapper: MemoryRouter });
  fireEvent.click(screen.getByRole("link", { name: /clients/i }));
  expect(onNavigate).toHaveBeenCalledTimes(1);
});
