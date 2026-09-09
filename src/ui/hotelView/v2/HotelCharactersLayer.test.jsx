import { render } from "@testing-library/react";
import HotelCharactersLayer from "./HotelCharactersLayer";

test("renders one sprite per guest and per staff member, capped at 6 each", () => {
  const { container } = render(<HotelCharactersLayer guestCount={3} staffCount={2} />);
  expect(container.querySelectorAll(".hv-character")).toHaveLength(5);
});

test("caps the number of visible sprites at 6 per group even with larger counts", () => {
  const { container } = render(<HotelCharactersLayer guestCount={20} staffCount={20} />);
  expect(container.querySelectorAll(".hv-character")).toHaveLength(12);
});

test("renders nothing when there are no guests or staff", () => {
  const { container } = render(<HotelCharactersLayer guestCount={0} staffCount={0} />);
  expect(container.querySelectorAll(".hv-character")).toHaveLength(0);
});
