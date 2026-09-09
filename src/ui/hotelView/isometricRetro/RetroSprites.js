// The retro-modern view's own sprite set -- deliberately different glyphs
// from v3's IsoSprites.js (not reused, per the spec), a more expressive,
// "cartoon" leaning selection. Still emoji, not image/SVG assets (same
// zero-asset-pipeline reasoning as every sprite sheet in this codebase --
// see ui/designSystem/icons.js/ui/hotelView/v2/HotelSprites.js), but
// composed by RetroCharacter.jsx inside a coloured "head" disc (see
// RetroStyle.js's RETRO_HEAD_SCALE) rather than shown bare, which is what
// actually gives them their cartoon proportions.
export const RETRO_GUEST_SPRITES = {
  idle: "🙂",
  walking: "🚶",
  eating: "🍜",
  checkin: "🛄",
  sleeping: "💤",
  leaving: "🙋",
};

export const RETRO_STAFF_SPRITES = {
  idle: "🙋‍♂️",
  walking: "🚶‍♂️",
  cleaning: "🧽",
  serving: "🍲",
  reception: "💁‍♀️",
  maintenance: "🛠️",
};

// Small decorative accents per room state -- "objets simplifiés mais
// reconnaissables" -- RetroRoom.jsx scatters 1-2 of these around the room
// tile so it reads as furnished, not just a coloured diamond.
export const RETRO_ROOM_PROPS = {
  clean: ["🛏️", "💡"],
  dirty: ["🗑️", "👕"],
  occupied: ["🧳", "👕"],
  cleaning: ["🧽", "🪣"],
};

export const RETRO_RECEPTION_PROPS = ["🛎️", "💻", "🪴"];
export const RETRO_RESTAURANT_PROPS = ["🍽️", "🪑", "🍲"];
export const RETRO_BACKOFFICE_PROPS = ["🧺", "🗄️", "🧴"];

export const RETRO_INCIDENT_SPRITES = { fire: "🔥", breakdown: "⚙️", noise: "📢" };

export function retroGuestSprite(activity = "idle") {
  return RETRO_GUEST_SPRITES[activity] || RETRO_GUEST_SPRITES.idle;
}

export function retroStaffSprite(activity = "idle") {
  return RETRO_STAFF_SPRITES[activity] || RETRO_STAFF_SPRITES.idle;
}

export function retroRoomProps(state = "clean") {
  return RETRO_ROOM_PROPS[state] || RETRO_ROOM_PROPS.clean;
}

export function retroIncidentSprite(type = "breakdown") {
  return RETRO_INCIDENT_SPRITES[type] || RETRO_INCIDENT_SPRITES.breakdown;
}

const RetroSprites = {
  RETRO_GUEST_SPRITES,
  RETRO_STAFF_SPRITES,
  RETRO_ROOM_PROPS,
  RETRO_RECEPTION_PROPS,
  RETRO_RESTAURANT_PROPS,
  RETRO_BACKOFFICE_PROPS,
  RETRO_INCIDENT_SPRITES,
  retroGuestSprite,
  retroStaffSprite,
  retroRoomProps,
  retroIncidentSprite,
};
export default RetroSprites;
