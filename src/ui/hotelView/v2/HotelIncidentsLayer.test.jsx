import { render, screen } from "@testing-library/react";
import HotelIncidentsLayer from "./HotelIncidentsLayer";

test("shows a reassuring message when there are no incidents", () => {
  render(<HotelIncidentsLayer diagnostics={[]} />);
  expect(screen.getByText(/aucun incident actif/i)).toBeInTheDocument();
});

test("lists error/high-severity diagnostics as incidents, ignoring low-severity ones", () => {
  const diagnostics = [
    { type: "error", severity: "high", message: "Panne électrique en cuisine." },
    { type: "opportunity", severity: "low", message: "Forte demande ce week-end." },
  ];
  render(<HotelIncidentsLayer diagnostics={diagnostics} />);
  expect(screen.getByText("Panne électrique en cuisine.")).toBeInTheDocument();
  expect(screen.queryByText("Forte demande ce week-end.")).not.toBeInTheDocument();
});
