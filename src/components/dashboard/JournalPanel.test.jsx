import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import JournalPanel from "./JournalPanel";

const renderPanel = (props) => render(<JournalPanel {...props} />, { wrapper: MemoryRouter });

test("shows a fallback message when there is nothing to report yet", () => {
  renderPanel({});
  expect(screen.getByText(/aucun événement notable/i)).toBeInTheDocument();
});

test("shows the causal chain lines when there are any", () => {
  renderPanel({ causalChain: ["Résultat positif du jour (200 €)."] });
  expect(screen.getByText("Résultat positif du jour (200 €).")).toBeInTheDocument();
});

test("links to reviews and GM Desk, with counts when there's something pending", () => {
  renderPanel({ reviewsToAnswer: 2, gmMessageCount: 3 });
  expect(screen.getByRole("link", { name: /avis clients \(2 en attente\)/i })).toHaveAttribute("href", "/clients/reviews");
  expect(screen.getByRole("link", { name: /gm desk \(3\)/i })).toHaveAttribute("href", "/gm-desk");
});

// Étape 4: the simplified financial result (Recettes - Charges = Résultat).
test("shows the simplified financial result: revenue, charges (derived) and profit", () => {
  renderPanel({ financialSummary: { revenue: 3000, profit: 500 } });
  const summary = screen.getByTestId("journal-financial-summary");
  expect(summary).toHaveTextContent("3 000 €");
  expect(summary).toHaveTextContent("2 500 €"); // charges = revenue - profit
  expect(summary).toHaveTextContent("500 €");
});

// Étape 4: today's featured review with its "Pourquoi cette note ?" block
// and its real impact on the reputation.
test("shows the featured review, its explanation and its reputation impact", () => {
  renderPanel({
    featuredReview: { rating: 2, text: "Chambre pas prête à mon arrivée.", impact: -0.6 },
    featuredExplanation: { positives: [], negatives: ["Un entretien général en retrait"], businessConcept: "Standing perçu" },
  });
  expect(screen.getByText("« Chambre pas prête à mon arrivée. »")).toBeInTheDocument();
  expect(screen.getByText(/impact réputation : -0.6 pt/i)).toBeInTheDocument();
  expect(screen.getByText("− Un entretien général en retrait")).toBeInTheDocument();
  expect(screen.getByText(/standing perçu/i)).toBeInTheDocument();
});

// Étape 4: the real cause-to-effect chains (lib/journal/causalityEngine.js).
test("shows the causal links as arrow-joined chains", () => {
  renderPanel({ causalLinks: [{ id: "price-occupancy", chain: ["Prix trop élevé", "Occupation en baisse"], businessConcept: "Élasticité-prix de la demande" }] });
  const item = screen.getByTestId("journal-causal-links");
  expect(item).toHaveTextContent("Prix trop élevé → Occupation en baisse");
  expect(item).toHaveTextContent("Élasticité-prix de la demande");
});
