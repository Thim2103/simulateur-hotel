// Registry of "direct action" modals a schematic zone's own alert
// indicator (a dirty/cleaning room, an amenity with an open incident --
// see SchematicHotelView.jsx's own click handling) can open immediately,
// instead of navigating away to that zone's full management page. Keyed
// by the same generic `type` EntityFactory.buildHotelSceneEntities()
// already produces for every entity ("room", or an amenity kind like
// "laundry") -- never a raw business field, same discipline as
// schematicTokens.js's own ZONE_STYLES.
//
// Empty today: no direct-action modal exists yet anywhere in this
// codebase for "clean this room" or "resolve this incident" (see this
// step's own research). SchematicHotelView.jsx already falls back to
// navigating to the zone's associated management page
// (schematicTokens.js's own `route`) whenever a lookup here comes back
// empty, so dropping in a real modal component later -- `{ room:
// CleanRoomModal, laundry: ResolveIncidentModal }` -- is a one-line
// addition here, no caller change needed. Each registered value must be a
// component accepting `{ entity, onClose }` and rendering its own
// GameModal (see ui/components/GameModal.jsx).
export const DIRECT_ACTION_MODALS = {};

export function getDirectActionModal(entity, registry = DIRECT_ACTION_MODALS) {
  return registry[entity.type] || null;
}

const DirectActions = { DIRECT_ACTION_MODALS, getDirectActionModal };
export default DirectActions;
