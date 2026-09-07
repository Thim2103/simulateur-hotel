import { render, screen } from "@testing-library/react";
import { CompetitionProvider, useCompetitionContext } from "./CompetitionContext";

function Probe() {
  const { competitionState } = useCompetitionContext();
  return <p>matches: {competitionState.matches.length}</p>;
}

function ThrowsOutsideProvider() {
  useCompetitionContext();
  return null;
}

test("useCompetitionContext() throws when used outside a CompetitionProvider", () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<ThrowsOutsideProvider />)).toThrow(/must be used within a <CompetitionProvider>/);
  spy.mockRestore();
});

test("CompetitionProvider supplies a single shared useCompetition() instance to its descendants", () => {
  render(
    <CompetitionProvider>
      <Probe />
    </CompetitionProvider>
  );
  expect(screen.getByText("matches: 0")).toBeInTheDocument();
});
