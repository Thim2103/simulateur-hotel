import { render } from "@testing-library/react";
import IsoFinalCharacter from "./IsoFinalCharacter";

test("renders a guest sprite by default", () => {
  const { container } = render(<IsoFinalCharacter kind="guest" col={1} row={1} />);
  const el = container.querySelector('[data-kind="guest"]');
  expect(el).toBeTruthy();
  expect(el).toHaveTextContent("😊");
});

test("renders the right sprite and cycle for staff-only activities (cooking, bartending, laundry)", () => {
  const { container, rerender } = render(<IsoFinalCharacter kind="staff" col={0} row={0} activity="cooking" />);
  let el = container.querySelector('[data-kind="staff"]');
  expect(el).toHaveTextContent("👨‍🍳");
  expect(el).toHaveClass("if-cook-cycle");

  rerender(<IsoFinalCharacter kind="staff" col={0} row={0} activity="bartending" />);
  el = container.querySelector('[data-kind="staff"]');
  expect(el).toHaveTextContent("🍸");
  expect(el).toHaveClass("if-bar-cycle");

  rerender(<IsoFinalCharacter kind="staff" col={0} row={0} activity="laundry" />);
  el = container.querySelector('[data-kind="staff"]');
  expect(el).toHaveTextContent("🧺");
  expect(el).toHaveClass("if-laundry-cycle");
});

test("walking defaults to the 6-frame step cycle", () => {
  const { container } = render(<IsoFinalCharacter kind="guest" col={0} row={0} activity="walking" />);
  expect(container.querySelector('[data-kind="guest"]')).toHaveClass("if-walk-cycle");
});
