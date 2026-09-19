import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildHotelSceneEntities } from "../engine/EntityFactory";
import { ZONE_STYLES, ROOM_STATE_STYLES, AMENITY_STATE_STYLES } from "./schematicTokens";
import { DIRECT_ACTION_MODALS, getDirectActionModal } from "./directActions";

// A synthetic, architectural "coupe longitudinale" (elevation/section) of
// the hotel: one horizontal row per floor (top floor at the top, ground
// floor -- reception, restaurant, etc. -- at the bottom), each cell a
// real room or amenity. This is deliberately NOT built on the isometric
// engine (IsoProjection/SceneTokens/Camera...) -- that pipeline exists to
// project a 3D-looking WORLD, whereas this is a flat, literal 2D plan;
// forcing it through iso projection would fight the very thing that makes
// a schematic legible. It IS built on the exact same business-data
// translation this app already has for the isometric views:
// EntityFactory.buildHotelSceneEntities() (see that file's own docstring)
// is still the ONLY place allowed to read `room.status`,
// `housekeeping_status`, `diagnostics`, etc. -- this component only ever
// consumes the already-generic `{type, state, metadata}` entities it
// produces, exactly like HotelScene.jsx/IsoFinalView.jsx do.
//
// "Adaptabilité dynamique": nothing here hardcodes a floor count or a room
// count -- floors and their room lists fall directly out of grouping
// whatever entities EntityFactory actually returned this render by their
// own `metadata.floorLevel`, so a bigger `rooms` array (more floors
// unlocked) grows this grid on its own, with no change needed here.
function groupRoomsByFloor(roomEntities) {
  const byLevel = new Map();
  roomEntities.forEach((entity) => {
    const level = entity.metadata.floorLevel;
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level).push(entity);
  });
  return Array.from(byLevel.entries())
    .sort(([levelA], [levelB]) => levelB - levelA)
    .map(([level, rooms]) => ({ level, rooms }));
}

function zoneStyle(type) {
  return ZONE_STYLES[type] || ZONE_STYLES.default;
}

function needsAttention(state) {
  return state === "dirty" || state === "cleaning" || state === "alert";
}

export default function SchematicHotelView({ rooms, staffCount, diagnostics, decisionFeedback, cleaningRoomIds, onSelectZone, directActionModals = DIRECT_ACTION_MODALS }) {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);
  const entities = buildHotelSceneEntities({ rooms, staffCount, diagnostics, decisionFeedback, cleaningRoomIds });
  const roomEntities = entities.filter((entity) => entity.type === "room");
  const amenityEntities = entities.filter((entity) => entity.type in ZONE_STYLES && entity.type !== "room");
  const floors = groupRoomsByFloor(roomEntities);

  // The block's own click: always the default routing (rule #1 -- clicking
  // a room/amenity block takes the player to its management page, or calls
  // a caller-supplied `onSelectZone` instead).
  const handleSelect = (entity) => {
    if (onSelectZone) {
      onSelectZone(entity);
      return;
    }
    const route = zoneStyle(entity.type).route;
    if (route) navigate(route);
  };

  // The zone's own ALERT INDICATOR (a dirty/cleaning room, an amenity with
  // an open incident) gets its own, separate click target (rule #2):
  // preferentially open that zone type's own direct-action modal (see
  // directActions.js) if one is registered, otherwise fall back to the
  // exact same default routing `handleSelect` does. A plain <button>
  // sibling positioned over the corner, not a nested interactive element
  // inside the block's own <button> -- nesting a clickable control inside
  // another is invalid HTML/inaccessible, so the two click targets are
  // siblings inside a shared relatively-positioned wrapper instead.
  const handleAlertClick = (event, entity) => {
    event.stopPropagation();
    const DirectActionModal = getDirectActionModal(entity, directActionModals);
    if (DirectActionModal) {
      setActiveModal({ Component: DirectActionModal, entity });
      return;
    }
    handleSelect(entity);
  };

  const ActiveModal = activeModal?.Component;

  return (
    <section
      data-testid="schematic-hotel-view"
      aria-label="Plan schématique de l'hôtel, coupe longitudinale par étage"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <header data-testid="schematic-legend" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Légende">
        {Object.entries(ZONE_STYLES)
          .filter(([type]) => type !== "default")
          .map(([type, style]) => (
            <span key={type} className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: style.color }} aria-hidden="true" />
              <span aria-hidden="true">{style.icon}</span>
              <span>{style.label}</span>
            </span>
          ))}
      </header>

      <div className="flex flex-col gap-2">
        {floors.map(({ level, rooms: floorRooms }) => (
          <div key={level} data-testid={`schematic-floor-${level}`} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">Étage {level}</span>
            <div className="flex flex-wrap gap-1.5">
              {floorRooms.map((room) => {
                const statusStyle = ROOM_STATE_STYLES[room.state] || ROOM_STATE_STYLES.clean;
                const roomNeedsAttention = needsAttention(room.state);
                return (
                  <div key={room.id} className="relative">
                    <button
                      type="button"
                      data-testid={`schematic-room-${room.metadata.number}`}
                      data-status={room.state}
                      title={`Chambre ${room.metadata.number} — ${statusStyle.label}`}
                      aria-label={`Chambre ${room.metadata.number}, ${statusStyle.label}`}
                      onClick={() => handleSelect(room)}
                      className="flex h-9 w-14 flex-col items-center justify-center rounded-md text-[10px] font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      style={{ backgroundColor: statusStyle.color }}
                    >
                      <span aria-hidden="true">{statusStyle.icon}</span>
                      <span>{room.metadata.number}</span>
                    </button>
                    {roomNeedsAttention && (
                      <button
                        type="button"
                        data-testid={`schematic-room-${room.metadata.number}-alert`}
                        title={`Action directe — ${statusStyle.label}`}
                        aria-label={`Action directe sur la chambre ${room.metadata.number}, ${statusStyle.label}`}
                        onClick={(event) => handleAlertClick(event, room)}
                        className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                        style={{ backgroundColor: statusStyle.color }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div data-testid="schematic-ground-floor" className="flex items-center gap-2 border-t border-slate-100 pt-2">
          <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">RDC</span>
          <div className="flex flex-wrap gap-1.5">
            {amenityEntities.map((amenity) => {
              const style = zoneStyle(amenity.type);
              const alert = amenity.state === "alert" ? AMENITY_STATE_STYLES.alert : null;
              return (
                <div key={amenity.id} className="relative">
                  <button
                    type="button"
                    data-testid={`schematic-amenity-${amenity.type}`}
                    data-status={amenity.state}
                    title={alert ? `${style.label} — ${alert.label}` : style.label}
                    aria-label={alert ? `${style.label}, ${alert.label}` : style.label}
                    onClick={() => handleSelect(amenity)}
                    className="flex h-9 w-16 flex-col items-center justify-center rounded-md text-[10px] font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    style={{ backgroundColor: style.color }}
                  >
                    <span aria-hidden="true">{style.icon}</span>
                    <span>{style.label}</span>
                  </button>
                  {alert && (
                    <button
                      type="button"
                      data-testid={`schematic-amenity-${amenity.type}-alert`}
                      title={`Action directe — ${alert.label}`}
                      aria-label={`Action directe — ${style.label}, ${alert.label}`}
                      onClick={(event) => handleAlertClick(event, amenity)}
                      className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      style={{ backgroundColor: alert.badgeColor }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {ActiveModal && <ActiveModal entity={activeModal.entity} onClose={() => setActiveModal(null)} />}
    </section>
  );
}
