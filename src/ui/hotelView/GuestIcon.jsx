import { bounce } from "../animations";

// A guest passing through the lobby/reception -- a small bouncing glyph,
// purely decorative (aria-hidden): the actual guest count is already
// stated in text next to it.
export default function GuestIcon({ animate = true }) {
  return (
    <span aria-hidden="true" className={`inline-block text-lg ${animate ? bounce : ""}`}>
      🧳
    </span>
  );
}
