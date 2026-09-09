// The isometric view's own sprite sheet -- 6 guest states + 6 staff
// states (same activity vocabulary as ui/hotelView/v2/HotelSprites.js,
// kept separate rather than shared because the iso view also needs 4
// room-state sprites and 3 incident-type sprites the flat 2D view
// doesn't). Emoji glyphs, not image/SVG assets -- same choice as
// ui/designSystem/icons.js and HotelSprites.js: zero bytes to fetch,
// renders identically everywhere, no asset pipeline.
export const ISO_GUEST_SPRITES = {
  idle: "🧍",
  walking: "🚶",
  eating: "🍽️",
  checkin: "🧳",
  sleeping: "😴",
  leaving: "👋",
};

export const ISO_STAFF_SPRITES = {
  idle: "🧑‍💼",
  walking: "🚶‍♂️",
  cleaning: "🧹",
  serving: "🍽️",
  reception: "🛎️",
  maintenance: "🔧",
};

export const ISO_ROOM_SPRITES = {
  clean: "🟦",
  dirty: "⬜",
  occupied: "🟨",
  cleaning: "🟩",
};

export const ISO_INCIDENT_SPRITES = {
  fire: "🔥",
  breakdown: "⚙️",
  noise: "🔊",
};

export function isoGuestSprite(activity = "idle") {
  return ISO_GUEST_SPRITES[activity] || ISO_GUEST_SPRITES.idle;
}

export function isoStaffSprite(activity = "idle") {
  return ISO_STAFF_SPRITES[activity] || ISO_STAFF_SPRITES.idle;
}

export function isoRoomSprite(state = "clean") {
  return ISO_ROOM_SPRITES[state] || ISO_ROOM_SPRITES.clean;
}

// Maps a diagnostic/incident's own vocabulary to one of the 3 incident
// sprites -- "fire"/technical keywords -> breakdown or fire, "noise"/
// client complaints -> noise, everything else defaults to "breakdown"
// (the most generic of the three).
export function isoIncidentSprite(type = "breakdown") {
  return ISO_INCIDENT_SPRITES[type] || ISO_INCIDENT_SPRITES.breakdown;
}

const IsoSprites = {
  ISO_GUEST_SPRITES,
  ISO_STAFF_SPRITES,
  ISO_ROOM_SPRITES,
  ISO_INCIDENT_SPRITES,
  isoGuestSprite,
  isoStaffSprite,
  isoRoomSprite,
  isoIncidentSprite,
};
export default IsoSprites;
