import { render, screen, fireEvent } from "@testing-library/react";

import GmInbox from "./GmInbox";

function message(overrides = {}) {
  return {
    id: "m1",
    type: "STAFF_ALERT",
    title: "Moral bas",
    description: "Le moral de l'équipe est bas.",
    severity: "high",
    module: "staff",
    actions: [{ id: "recruter", label: "Recruter" }],
    ...overrides,
  };
}

test("shows a reassuring message when the inbox is empty", () => {
  render(<GmInbox messages={[]} onOpen={jest.fn()} />);
  expect(screen.getByText(/aucun message pour l'instant/i)).toBeInTheDocument();
});

test("lists messages, most severe first, and opens one on click", () => {
  const onOpen = jest.fn();
  const messages = [message({ id: "low1", severity: "low", title: "Opportunité" }), message({ id: "high1", severity: "high", title: "Urgent" })];
  render(<GmInbox messages={messages} onOpen={onOpen} />);

  const titles = screen.getAllByText(/urgent|opportunité/i).map((el) => el.textContent);
  expect(titles[0]).toBe("Urgent");

  fireEvent.click(screen.getByText("Urgent"));
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "high1" }));
});

test("filters by category and by priority", () => {
  const messages = [message({ id: "a", module: "staff", severity: "high", title: "RH" }), message({ id: "b", module: "finance", severity: "low", title: "Argent" })];
  render(<GmInbox messages={messages} onOpen={jest.fn()} />);

  fireEvent.change(screen.getByLabelText(/filtrer par catégorie/i), { target: { value: "finance" } });
  expect(screen.queryByText("RH")).not.toBeInTheDocument();
  expect(screen.getByText("Argent")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/filtrer par catégorie/i), { target: { value: "all" } });
  fireEvent.change(screen.getByLabelText(/filtrer par priorité/i), { target: { value: "high" } });
  expect(screen.getByText("RH")).toBeInTheDocument();
  expect(screen.queryByText("Argent")).not.toBeInTheDocument();
});
