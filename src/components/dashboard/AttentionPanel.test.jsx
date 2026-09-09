import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AttentionPanel from "./AttentionPanel";

test("shows a reassuring message when there is nothing to report", () => {
  render(<AttentionPanel items={[]} />, { wrapper: MemoryRouter });
  expect(screen.getByText(/rien à signaler/i)).toBeInTheDocument();
});

test("lists each item with a working Analyser link", () => {
  const items = [
    { id: "p1", bucket: "problems", bucketLabel: "Problème", message: "Occupation faible.", severity: "high", moduleLabel: "Revenue Management", moduleLink: "/rm-dashboard" },
  ];
  render(<AttentionPanel items={items} />, { wrapper: MemoryRouter });
  expect(screen.getByText("Occupation faible.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /analyser · revenue management/i })).toHaveAttribute("href", "/rm-dashboard");
});
