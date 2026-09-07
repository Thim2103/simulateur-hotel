import { render, screen } from "@testing-library/react";
import { ChainProvider, useChainContext } from "./ChainContext";

function Probe() {
  const { chainState } = useChainContext();
  return <p>hotels: {chainState.hotels.length}</p>;
}

function ThrowsOutsideProvider() {
  useChainContext();
  return null;
}

test("useChainContext() throws when used outside a ChainProvider", () => {
  // Suppress the expected React error-boundary console noise for this test.
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<ThrowsOutsideProvider />)).toThrow(/must be used within a <ChainProvider>/);
  spy.mockRestore();
});

test("ChainProvider supplies a single shared useChain() instance to its descendants", () => {
  render(
    <ChainProvider>
      <Probe />
    </ChainProvider>
  );
  expect(screen.getByText("hotels: 0")).toBeInTheDocument();
});
