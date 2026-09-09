import { tileToScreen } from "../engine/IsoProjection";
import { ISO_FINAL_PROJECTION } from "./IsoFinalGrid";
import { guestSprite, staffSprite } from "./IsoFinalSprites";
import { PALETTE, STROKE_WIDTH, SHADOW_FILTER_SOFT, HEAD_HEIGHT_RATIO } from "./IsoFinalStyle";
import { activityCycleClassName } from "./IsoFinalAnimations";
import "./isoFinalView.css";

// One ambient guest or staff character, "expressif et lisible" per the
// Bible: cartoon proportions (head = 40% of the character's own height,
// see IsoFinalStyle.js's HEAD_HEIGHT_RATIO) via a bigger head disc sat on
// top of a small body pill, rather than a single bare glyph.
//
// Two nested elements: the outer span owns the isometric *position*; the
// inner span owns the cartoon *motion* (its own named cycle, see
// IsoFinalAnimations.js). A CSS `animation` replaces `transform` outright
// rather than composing with it, so the two can never live on the same
// element -- same lesson documented in RetroCharacter.jsx/radialNav.css.
//
// Characters are the most frequently repositioned entity in this view
// (their world position is recomputed on every render, unlike rooms/
// ground-floor blocks which only ever sit at a handful of fixed tiles) --
// see the "corriger le positionnement DOM" step -- so the outer span's
// `left`/`top` are pinned to a constant 0 (set once, never rewritten) and
// its actual screen position lives entirely in `transform:
// translate3d(...)`. `left`/`top` changes force a browser layout/reflow
// pass; `transform` is compositor-only (GPU), so this is the one change
// that removes real reflow cost from the entity that pays it most often.
// Every other isometricFinal/ element still positions via `left`/`top` on
// purpose (see the migration plan's own note on not doing this
// wholesale) -- they reposition rarely enough (once per render, at a
// handful of fixed tile coordinates) that the reflow cost is negligible.
export default function IsoFinalCharacter({ kind, col, row, activity = "idle" }) {
  const { x, y } = tileToScreen({ col, row }, ISO_FINAL_PROJECTION);
  const sprite = kind === "staff" ? staffSprite(activity) : guestSprite(activity);
  const fill = kind === "staff" ? PALETTE.coralPink : PALETTE.glacierBlue;
  const bodyHeight = Math.round(28 * (1 - HEAD_HEIGHT_RATIO));

  return (
    <span
      aria-hidden="true"
      className="absolute flex flex-col items-center"
      style={{ left: 0, top: 0, transform: `translate3d(calc(${x}px - 50%), calc(${y}px - 100%), 0)` }}
    >
      <span
        data-kind={kind}
        data-activity={activity}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${activityCycleClassName(activity)}`}
        style={{ backgroundColor: fill, border: `${STROKE_WIDTH} solid ${PALETTE.nightBlue}`, filter: SHADOW_FILTER_SOFT }}
      >
        {sprite}
      </span>
      <span aria-hidden="true" className="rounded-b-full" style={{ width: 14, height: bodyHeight, backgroundColor: PALETTE.nightBlue, opacity: 0.25 }} />
    </span>
  );
}
