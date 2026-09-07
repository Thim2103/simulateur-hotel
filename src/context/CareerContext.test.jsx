import { render, screen } from "@testing-library/react";
import { CareerProvider, useCareerContext } from "./CareerContext";

function Probe() {
  const { careerState } = useCareerContext();
  return <p>career: {careerState ? "started" : "not started"}</p>;
}

function ThrowsOutsideProvider() {
  useCareerContext();
  return null;
}

test("useCareerContext() throws when used outside a CareerProvider", () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<ThrowsOutsideProvider />)).toThrow(/must be used within a <CareerProvider>/);
  spy.mockRestore();
});

test("CareerProvider supplies a single shared useCareer() instance to its descendants", () => {
  render(
    <CareerProvider>
      <Probe />
    </CareerProvider>
  );
  expect(screen.getByText("career: not started")).toBeInTheDocument();
});
