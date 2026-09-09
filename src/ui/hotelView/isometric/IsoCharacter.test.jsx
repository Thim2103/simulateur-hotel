import { render } from "@testing-library/react";
import IsoCharacter from "./IsoCharacter";

test("renders a guest sprite by default, positioned via the isometric projection", () => {
  const { container } = render(<IsoCharacter kind="guest" col={1} row={1} />);
  const el = container.querySelector('[data-kind="guest"]');
  expect(el).toBeTruthy();
  expect(el).toHaveTextContent("🧍");
  expect(el.style.left).not.toBe("");
});

test("renders the right sprite for each activity", () => {
  const { container, rerender } = render(<IsoCharacter kind="staff" col={0} row={0} activity="cleaning" />);
  expect(container.querySelector('[data-kind="staff"]')).toHaveTextContent("🧹");

  rerender(<IsoCharacter kind="guest" col={0} row={0} activity="eating" />);
  expect(container.querySelector('[data-kind="guest"]')).toHaveTextContent("🍽️");
});
