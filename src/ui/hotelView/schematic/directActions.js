import HousekeepingQuickModal from "./HousekeepingQuickModal";
import IncidentQuickModal from "./IncidentQuickModal";

// Registry of "direct action" modals a schematic zone's own alert
// indicator (a dirty/cleaning room, an amenity with an open incident --
// see SchematicHotelView.jsx's own click handling) can open immediately,
// instead of navigating away to that zone's full management page. Keyed
// by the same generic `type` EntityFactory.buildHotelSceneEntities()
// already produces for every entity ("room", or an amenity kind like
// "laundry") -- never a raw business field, same discipline as
// schematicTokens.js's own ZONE_STYLES.
//
// `laundry` is the only amenity kind EntityFactory.js can ever put into
// an "alert" state today (see its own `buildAmenityEntities()`) -- the
// other amenity kinds simply never carry an alert badge yet, so they have
// no entry here either. SchematicHotelView.jsx falls back to navigating
// to the zone's associated management page (schematicTokens.js's own
// `route`) whenever a lookup here comes back empty, so any future amenity
// kind that starts producing incidents just needs its own entry added
// here, no caller change needed. Each registered value must be a
// component accepting `{ entity, onClose, ...directActionCallbacks }` and
// rendering its own GameModal (see ui/components/GameModal.jsx).
export const DIRECT_ACTION_MODALS = {
  room: HousekeepingQuickModal,
  laundry: IncidentQuickModal,
};

export function getDirectActionModal(entity, registry = DIRECT_ACTION_MODALS) {
  return registry[entity.type] || null;
}

const DirectActions = { DIRECT_ACTION_MODALS, getDirectActionModal };
export default DirectActions;
