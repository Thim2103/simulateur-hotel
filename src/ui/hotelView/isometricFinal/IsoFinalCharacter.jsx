import { toIsoFinal } from "./IsoFinalGrid";
import { guestSprite, staffSprite } from "./IsoFinalSprites";
import { PALETTE, STROKE_WIDTH, SHADOW_FILTER_SOFT, HEAD_HEIGHT_RATIO } from "./IsoFinalStyle";
import { activityCycleClassName } from "./IsoFinalAnimations";
import "./isoFinalView.css";

// One ambient guest or staff character, "expressif et lisible" per the
// Bible: cartoon proportions (head = 40% of the character's own height,
// see IsoFinalStyle.js's HEAD_HEIGHT_RATIO) via a bigger head disc sat on
// top of a small body pill, rather than a single bare glyph.
//
// Two nested elements: the outer span owns the isometric *position*
// (static translate, see toIsoFinal()); the inner span owns the cartoon
// *motion* (its own named cycle, see IsoFinalAnimations.js). A CSS
// `animation` replaces `transform` outright rather than composing with
// it, so the two can never live on the same element -- same lesson
// documented in RetroCharacter.jsx/radialNav.css.
export default function IsoFinalCharacter({ kind, col, row, activity = "idle" }) {
  const { x, y } = toIsoFinal(col, row);
  const sprite = kind === "staff" ? staffSprite(activity) : guestSprite(activity);
  const fill = kind === "staff" ? PALETTE.coralPink : PALETTE.glacierBlue;
  const bodyHeight = Math.round(28 * (1 - HEAD_HEIGHT_RATIO));

  return (
    <span aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center" style={{ left: x, top: y }}>
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
