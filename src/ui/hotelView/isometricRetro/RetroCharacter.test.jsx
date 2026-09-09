import { render } from "@testing-library/react";
import RetroCharacter from "./RetroCharacter";

test("renders a guest sprite by default, inside its own coloured disc", () => {
  const { container } = render(<RetroCharacter kind="guest" col={1} row={1} />);
  const el = container.querySelector('[data-kind="guest"]');
  expect(el).toBeTruthy();
  expect(el).toHaveTextContent("🙂");
});

test("renders the right sprite for each activity, with a matching animation class", () => {
  const { container, rerender } = render(<RetroCharacter kind="staff" col={0} row={0} activity="cleaning" />);
  const staffEl = container.querySelector('[data-kind="staff"]');
  expect(staffEl).toHaveTextContent("🧽");
  expect(staffEl).toHaveClass("retro-clean-cycle");

  rerender(<RetroCharacter kind="guest" col={0} row={0} activity="eating" />);
  const guestEl = container.querySelector('[data-kind="guest"]');
  expect(guestEl).toHaveTextContent("🍜");
  expect(guestEl).toHaveClass("retro-eat-cycle");
});

test("walking defaults to the 4-frame step cycle", () => {
  const { container } = render(<RetroCharacter kind="guest" col={0} row={0} activity="walking" />);
  expect(container.querySelector('[data-kind="guest"]')).toHaveClass("retro-walk-cycle");
});
