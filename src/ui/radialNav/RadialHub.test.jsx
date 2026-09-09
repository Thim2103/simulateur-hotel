import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RadialHub from "./RadialHub";

test("shows 'Mon Hôtel' linking to /dashboard", () => {
  render(<RadialHub onNavigate={jest.fn()} />, { wrapper: MemoryRouter });
  const link = screen.getByRole("link", { name: /mon hôtel/i });
  expect(link).toHaveAttribute("href", "/dashboard");
});

test("calls onNavigate when clicked", () => {
  const onNavigate = jest.fn();
  render(<RadialHub onNavigate={onNavigate} />, { wrapper: MemoryRouter });
  fireEvent.click(screen.getByRole("link", { name: /mon hôtel/i }));
  expect(onNavigate).toHaveBeenCalledTimes(1);
});
