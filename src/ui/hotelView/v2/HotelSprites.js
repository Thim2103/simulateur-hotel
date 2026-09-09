// The "sprite sheet" for HotelView2D v2's characters: 6 guest states + 6
// staff states (see ./sprites/*.js, one file per sprite -- emoji glyphs,
// not image/SVG assets, same choice as ui/designSystem/icons.js: zero
// bytes to fetch, renders identically everywhere, no asset pipeline).
// This module is the single lookup table every v2 layer imports instead
// of reaching into ./sprites/ directly.
import guestIdle from "./sprites/guest-idle";
import guestWalking from "./sprites/guest-walking";
import guestEating from "./sprites/guest-eating";
import guestCheckin from "./sprites/guest-checkin";
import guestSleeping from "./sprites/guest-sleeping";
import guestLeaving from "./sprites/guest-leaving";
import staffIdle from "./sprites/staff-idle";
import staffWalking from "./sprites/staff-walking";
import staffCleaning from "./sprites/staff-cleaning";
import staffServing from "./sprites/staff-serving";
import staffReception from "./sprites/staff-reception";
import staffMaintenance from "./sprites/staff-maintenance";

export const GUEST_SPRITES = {
  idle: guestIdle,
  walking: guestWalking,
  eating: guestEating,
  checkin: guestCheckin,
  sleeping: guestSleeping,
  leaving: guestLeaving,
};

export const STAFF_SPRITES = {
  idle: staffIdle,
  walking: staffWalking,
  cleaning: staffCleaning,
  serving: staffServing,
  reception: staffReception,
  maintenance: staffMaintenance,
};

export function guestSprite(activity = "idle") {
  return GUEST_SPRITES[activity] || GUEST_SPRITES.idle;
}

export function staffSprite(activity = "idle") {
  return STAFF_SPRITES[activity] || STAFF_SPRITES.idle;
}

const HotelSprites = { GUEST_SPRITES, STAFF_SPRITES, guestSprite, staffSprite };
export default HotelSprites;
