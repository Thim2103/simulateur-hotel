import { render, screen } from "@testing-library/react";
import { AcademyProvider, useAcademyContext } from "./AcademyContext";

function Probe() {
  const { academyState } = useAcademyContext();
  return <p>classes: {academyState.classes.length}</p>;
}

function ThrowsOutsideProvider() {
  useAcademyContext();
  return null;
}

test("useAcademyContext() throws when used outside an AcademyProvider", () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<ThrowsOutsideProvider />)).toThrow(/must be used within an <AcademyProvider>/);
  spy.mockRestore();
});

test("AcademyProvider supplies a single shared useAcademy() instance to its descendants", () => {
  render(
    <AcademyProvider>
      <Probe />
    </AcademyProvider>
  );
  expect(screen.getByText("classes: 0")).toBeInTheDocument();
});
