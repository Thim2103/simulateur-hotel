// Centralised look-and-feel for SchematicHotelView.jsx: one entry per zone
// TYPE (icon, label, base color, and where a click should navigate) plus a
// separate table for room STATUS shades. Kept here, not inline in the
// component, for the same reason SceneTokens.js exists for the isometric
// scene -- a single place to look up/adjust "what does X mean visually"
// rather than colors scattered through JSX.
//
// `pool`/`rooftop`/`service` are included even though nothing in the real
// data model produces those zone types yet (see EntityFactory.js -- rooms
// only ever carry `type: "room"`, amenities only the six
// HotelSceneLayout.AMENITY_LAYOUT kinds): this is what makes the legend
// "adaptable" per the spec's own "s'agrandit... en fonction des
// améliorations débloquées" requirement -- the day a basement/rooftop/pool
// entity type is added upstream, it renders with a real style instead of
// falling back to ZONE_STYLES.default, with no change needed here.
export const ZONE_STYLES = {
  room: { label: "Chambre", icon: "🛏️", color: "#2563eb", route: "/rooms" },
  reception: { label: "Réception", icon: "🔑", color: "#0d9488", route: "/pms" },
  restaurant: { label: "Restaurant", icon: "🍽️", color: "#ea580c", route: "/restaurant" },
  kitchen: { label: "Cuisine", icon: "🍳", color: "#b91c1c", route: "/restaurant" },
  bar: { label: "Bar", icon: "🍸", color: "#7c3aed", route: "/restaurant" },
  laundry: { label: "Buanderie", icon: "🧺", color: "#a855f7", route: "/housekeeping" },
  hall: { label: "Hall", icon: "🚪", color: "#0891b2", route: "/pms" },
  pool: { label: "Piscine", icon: "🏊", color: "#38bdf8", route: null },
  rooftop: { label: "Rooftop", icon: "🌇", color: "#f59e0b", route: null },
  service: { label: "Zone de service", icon: "🧰", color: "#64748b", route: null },
  default: { label: "Zone", icon: "❔", color: "#94a3b8", route: null },
};

// A room's real-time status (see EntityFactory.js's own `roomState()` --
// the ONE place allowed to read `room.status`/`housekeeping_status`; this
// view only ever sees the already-translated generic state string).
export const ROOM_STATE_STYLES = {
  occupied: { label: "Occupée", color: "#1d4ed8", icon: "🧍" },
  clean: { label: "Libre", color: "#7dd3fc", icon: "✅" },
  dirty: { label: "À nettoyer", color: "#f59e0b", icon: "🧹" },
  cleaning: { label: "Nettoyage en cours", color: "#a855f7", icon: "🧽" },
};

// An amenity's own generic state -- "alert"/"repairing" are
// EntityFactory's translation of a real, persistent incident's own status
// (see lib/maintenance/incidentEngine.js and EntityFactory.js's own
// `buildAmenityEntitiesFromIncidents()`), never a raw diagnostics/incident
// field read here.
export const AMENITY_STATE_STYLES = {
  alert: { label: "Panne / incident", badgeColor: "#dc2626" },
  repairing: { label: "Réparation en cours", badgeColor: "#f59e0b" },
};

const SchematicTokens = { ZONE_STYLES, ROOM_STATE_STYLES, AMENITY_STATE_STYLES };
export default SchematicTokens;
