import { render, screen } from "@testing-library/react";
import MarketContextCard from "./MarketContextCard";

const context = {
  destination: { id: "ardennes", name: "Ardennes / Campagne" },
  season: { id: "summer", label: "Haute saison — été", icon: "☀️", tier: "high" },
  dominantSegment: { id: "hikers-eco", label: "Randonneurs / Éco", icon: "🥾", priceSensitivity: 0.8 },
  competitivePressure: { averagePrice: 80, competitorsCount: 2, delta: 12 },
  localEvent: { id: "rando-guidee", label: "Randonnée guidée organisée", icon: "🥾", boostedSegment: { label: "Randonneurs / Éco" } },
};

test("renders nothing without a context yet", () => {
  const { container } = render(<MarketContextCard context={null} />);
  expect(container).toBeEmptyDOMElement();
});

test("shows the season, the dominant segment (flagging price sensitivity) and the competitive pressure", () => {
  render(<MarketContextCard context={context} />);
  expect(screen.getByTestId("market-season")).toHaveTextContent("Haute saison — été");
  expect(screen.getByTestId("market-season")).toHaveTextContent("forte affluence");
  expect(screen.getByTestId("market-segment")).toHaveTextContent("Randonneurs / Éco");
  expect(screen.getByTestId("market-segment")).toHaveTextContent("sensibles au prix");
  expect(screen.getByTestId("market-competition")).toHaveTextContent("80 €/nuit");
  expect(screen.getByTestId("market-competition")).toHaveTextContent("+12 %");
});

test("shows today's local event when there is one", () => {
  render(<MarketContextCard context={context} />);
  expect(screen.getByTestId("market-event")).toHaveTextContent("Randonnée guidée organisée");
});

test("omits the event line when there is none today", () => {
  render(<MarketContextCard context={{ ...context, localEvent: null }} />);
  expect(screen.queryByTestId("market-event")).not.toBeInTheDocument();
});

test("omits the competition line for a destination with no competitor archetype", () => {
  render(<MarketContextCard context={{ ...context, competitivePressure: null }} />);
  expect(screen.queryByTestId("market-competition")).not.toBeInTheDocument();
});
