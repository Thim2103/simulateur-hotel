import { render, screen } from "@testing-library/react";
import GuestFlowPanel, { attractivenessLevel, PROFILE_COLORS } from "./GuestFlowPanel";

const distribution = (counts) => {
  const labels = { vip: "VIP", business: "Business", family: "Famille", tourist: "Touriste", budget: "Budget" };
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return Object.keys(labels).map((key) => ({ key, label: labels[key], count: counts[key] || 0, share: total ? (counts[key] || 0) / total : 0 }));
};

const stats = (overrides = {}) => ({
  averageRating: 4.25,
  reviewCount: 12,
  reputation: 81,
  attractiveness: 1.62,
  rejectedCount: 7,
  welcomedCount: 20,
  profileDistribution: distribution({ vip: 5, business: 10, budget: 5 }),
  ...overrides,
});

test("renders nothing without stats", () => {
  const { container } = render(<GuestFlowPanel stats={null} />);
  expect(container).toBeEmptyDOMElement();
});

test("shows the average rating with its review count, the attractiveness level and the refusal counter", () => {
  render(<GuestFlowPanel stats={stats()} />);
  expect(screen.getByText("Note moyenne")).toBeInTheDocument();
  expect(screen.getByText("4.3/5 (12 avis)")).toBeInTheDocument();
  expect(screen.getByText("Attractivité")).toBeInTheDocument();
  expect(screen.getByText("Exceptionnelle (x1.62)")).toBeInTheDocument();
  expect(screen.getByText("Clients refusés (prix)")).toBeInTheDocument();
  expect(screen.getByText("7")).toBeInTheDocument();
});

test("shows 'Aucun avis' when averageRating is null", () => {
  render(<GuestFlowPanel stats={stats({ averageRating: null, reviewCount: 0 })} />);
  expect(screen.getByText("Aucun avis")).toBeInTheDocument();
});

test("draws one bar segment per welcomed profile, sized by its share, with a labelled legend", () => {
  render(<GuestFlowPanel stats={stats()} />);
  expect(screen.getByRole("img", { name: /répartition des profils clients/i })).toBeInTheDocument();
  expect(screen.getByText("Répartition des profils (20 clients)")).toBeInTheDocument();

  expect(screen.getByTestId("profile-bar-business")).toHaveStyle({ width: "50%" });
  expect(screen.getByTestId("profile-bar-vip")).toHaveStyle({ width: "25%" });
  expect(screen.getByTestId("profile-bar-vip")).toHaveAttribute("title", "VIP : 5 (25 %)");
  expect(screen.queryByTestId("profile-bar-family")).not.toBeInTheDocument();

  expect(screen.getByText("Business")).toBeInTheDocument();
  expect(screen.getByText("10 · 50 %")).toBeInTheDocument();
  expect(screen.queryByText("Famille")).not.toBeInTheDocument();
});

test("keeps each profile's colour regardless of its rank in the mix", () => {
  render(<GuestFlowPanel stats={stats({ profileDistribution: distribution({ budget: 9, vip: 1 }) })} />);
  expect(screen.getByTestId("profile-bar-budget")).toHaveStyle({ backgroundColor: PROFILE_COLORS.budget });
  expect(screen.getByTestId("profile-bar-vip")).toHaveStyle({ backgroundColor: PROFILE_COLORS.vip });
});

test("shows an empty state before any guest has been welcomed", () => {
  render(<GuestFlowPanel stats={stats({ welcomedCount: 0, profileDistribution: distribution({}) })} />);
  expect(screen.getByText("Aucun client accueilli pour l'instant.")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test("maps attractiveness to readable levels", () => {
  expect(attractivenessLevel(0.5)).toBe("Faible");
  expect(attractivenessLevel(1)).toBe("Normale");
  expect(attractivenessLevel(1.4)).toBe("Élevée");
  expect(attractivenessLevel(2)).toBe("Exceptionnelle");
  expect(attractivenessLevel(undefined)).toBeNull();
});
