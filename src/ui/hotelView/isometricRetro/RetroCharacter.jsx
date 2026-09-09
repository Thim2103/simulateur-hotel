import { toIsoRetro } from "./RetroGrid";
import { retroGuestSprite, retroStaffSprite } from "./RetroSprites";
import { RETRO_PALETTE, RETRO_SHADOW_SOFT, RETRO_STROKE_WIDTH } from "./RetroStyle";
import "./retroView.css";

// Which looping CSS class (see retroView.css) an activity gets by
// default -- walking always bobs (steps(4), a genuine "4 frame" cartoon
// walk cycle), a few activities get their own named cycle, everything
// else just gets a gentle idle bob.
const ACTIVITY_CLASS = {
  walking: "retro-walk-cycle",
  cleaning: "retro-clean-cycle",
  eating: "retro-eat-cycle",
  serving: "retro-clean-cycle",
  checkin: "retro-checkin-cycle",
};

// One ambient guest or staff character, retro-modern style: the sprite
// glyph sits inside an oversized, coloured "head" disc (cartoon
// proportions, see RetroStyle.js's RETRO_HEAD_SCALE) with a thin outline
// and a soft drop shadow, rather than shown bare like v3's plain emoji.
//
// Two nested elements on purpose: the outer span owns the isometric
// *position* (`left`/`top` + a static centering translate, see
// toIsoRetro()) and is never animated; the inner span owns the cartoon
// *motion* (retro-walk-cycle etc., see retroView.css). A CSS `animation`
// replaces an element's `transform` outright rather than composing with
// it, so animating the same element that also carries the centering
// translate would silently un-center it -- the split avoids that.
export default function RetroCharacter({ kind, col, row, activity = "idle" }) {
  const { x, y } = toIsoRetro(col, row);
  const sprite = kind === "staff" ? retroStaffSprite(activity) : retroGuestSprite(activity);
  const palette = kind === "staff" ? RETRO_PALETTE.pink : RETRO_PALETTE.blue;
  const animationClass = ACTIVITY_CLASS[activity] || "retro-walk-cycle";

  return (
    <span aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-full" style={{ left: x, top: y }}>
      <span
        data-kind={kind}
        data-activity={activity}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${animationClass}`}
        style={{ backgroundColor: palette.soft, border: `${RETRO_STROKE_WIDTH} solid ${palette.stroke}`, filter: RETRO_SHADOW_SOFT }}
      >
        {sprite}
      </span>
    </span>
  );
}
