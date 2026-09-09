import { pulse } from "../animations";

// An active incident/alert glyph -- pulses to draw the eye, same
// severity-red the rest of the app (AttentionPanel, GameBadge) uses for
// "high" severity.
export default function IncidentIcon() {
  return (
    <span aria-hidden="true" className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-xs text-rose-600 ${pulse}`}>
      ❗
    </span>
  );
}
