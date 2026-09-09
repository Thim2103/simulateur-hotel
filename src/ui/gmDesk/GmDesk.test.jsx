import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GmDesk from "./GmDesk";
import { useGmDesk } from "./GmDeskProvider";
import { openRadialNav } from "../radialNav/radialNavBus";

jest.mock("../radialNav/radialNavBus", () => ({ openRadialNav: jest.fn() }));

jest.mock("./GmDeskProvider", () => ({
  ...jest.requireActual("./GmDeskProvider"),
  useGmDesk: jest.fn(),
}));

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

test("shows priority counts and the inbox", () => {
  useGmDesk.mockReturnValue({ messages: [message(), message({ id: "m2", severity: "low", title: "Opportunité locale" })], applyMessageDecision: jest.fn() });
  render(<GmDesk />, { wrapper: MemoryRouter });

  expect(screen.getByRole("heading", { name: /la voix de l'hôtel/i })).toBeInTheDocument();
  expect(screen.getByText("Moral bas")).toBeInTheDocument();
});

test("the 'Retour à la navigation' button opens the Radial Navigation", () => {
  useGmDesk.mockReturnValue({ messages: [], applyMessageDecision: jest.fn() });
  render(<GmDesk />, { wrapper: MemoryRouter });
  fireEvent.click(screen.getByRole("button", { name: /retour à la navigation/i }));
  expect(openRadialNav).toHaveBeenCalledTimes(1);
});

test("opening a message and applying a decision shows a confirmation notification", async () => {
  const applyMessageDecision = jest.fn().mockResolvedValue(null);
  useGmDesk.mockReturnValue({ messages: [message()], applyMessageDecision });
  render(<GmDesk />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByText("Moral bas"));
  expect(screen.getByRole("dialog", { name: /moral bas/i })).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText(/recruter/i));
  fireEvent.click(screen.getByRole("button", { name: /^appliquer$/i }));

  await waitFor(() => expect(applyMessageDecision).toHaveBeenCalledWith(expect.objectContaining({ id: "m1" }), "recruter"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/décision appliquée/i));
});

test("surfaces an error notification when applying a decision fails", async () => {
  const applyMessageDecision = jest.fn().mockRejectedValue(new Error("hors ligne"));
  useGmDesk.mockReturnValue({ messages: [message()], applyMessageDecision });
  render(<GmDesk />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByText("Moral bas"));
  fireEvent.click(screen.getByLabelText(/recruter/i));
  fireEvent.click(screen.getByRole("button", { name: /^appliquer$/i }));

  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/impossible d'appliquer/i));
});
