// The premium view's own sprite set -- a fresh selection, distinct from
// v2/v3/RetroView's (none of their emoji choices are reused here), emoji
// glyphs rather than image/SVG assets (same zero-asset-pipeline choice as
// every sprite sheet in this codebase). Composed by IsoFinalCharacter.jsx
// inside a "40% head / 60% body" cartoon silhouette (see IsoFinalStyle.js)
// rather than shown bare.
export const GUEST_SPRITES = {
  idle: "😊",
  walking: "🚶",
  eating: "🍝",
  checkin: "🎒",
  sleeping: "😴",
  leaving: "👋",
};

export const STAFF_SPRITES = {
  idle: "😀",
  walking: "🚶‍♀️",
  cleaning: "🧹",
  serving: "🥂",
  reception: "🧑‍💼",
  maintenance: "🔧",
  cooking: "👨‍🍳",
  bartending: "🍸",
  laundry: "🧺",
};

// Decorative props per room state -- "objets simplifiés mais
// reconnaissables", exaggerated per the Bible ("lits plus larges").
export const ROOM_PROPS = {
  clean: ["🛏️", "💡", "🛁"],
  dirty: ["🗑️", "🩳"],
  occupied: ["🧳", "👗"],
  cleaning: ["🧹", "🪣"],
};

export const RECEPTION_PROPS = ["🛎️", "💻", "🪴", "🧳"];
export const RESTAURANT_PROPS = ["⭕", "🪑", "🍽️"];
export const KITCHEN_PROPS = ["🔥", "🧊", "🔪"];
export const BAR_PROPS = ["🍾", "🪑", "🍹"];
export const LAUNDRY_PROPS = ["🌀", "🧺"];
export const HALL_PROPS = ["🛋️", "🖼️", "🛗"];

export const INCIDENT_SPRITES = { fire: "🔥", breakdown: "⚡", noise: "📢" };

export function guestSprite(activity = "idle") {
  return GUEST_SPRITES[activity] || GUEST_SPRITES.idle;
}

export function staffSprite(activity = "idle") {
  return STAFF_SPRITES[activity] || STAFF_SPRITES.idle;
}

export function roomProps(state = "clean") {
  return ROOM_PROPS[state] || ROOM_PROPS.clean;
}

export function incidentSprite(type = "breakdown") {
  return INCIDENT_SPRITES[type] || INCIDENT_SPRITES.breakdown;
}

const IsoFinalSprites = {
  GUEST_SPRITES,
  STAFF_SPRITES,
  ROOM_PROPS,
  RECEPTION_PROPS,
  RESTAURANT_PROPS,
  KITCHEN_PROPS,
  BAR_PROPS,
  LAUNDRY_PROPS,
  HALL_PROPS,
  INCIDENT_SPRITES,
  guestSprite,
  staffSprite,
  roomProps,
  incidentSprite,
};
export default IsoFinalSprites;
