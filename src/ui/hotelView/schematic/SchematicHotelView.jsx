import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildHotelSceneEntities } from "../engine/EntityFactory";
import { ZONE_STYLES, ROOM_STATE_STYLES, AMENITY_STATE_STYLES } from "./schematicTokens";
import { DIRECT_ACTION_MODALS, getDirectActionModal } from "./directActions";
import ZoneUpgradeModal from "./ZoneUpgradeModal";
import { ZONES, zoneSummary, zoneForCell, levelStars } from "../../../lib/zones/zoneUpgradesEngine";
import ExpansionModal from "./ExpansionModal";
import VipActionModal from "./VipActionModal";
import MiceBookingModal from "./MiceBookingModal";
import { pendingRequests, meetingRooms } from "../../../lib/mice/miceEngine";
import { expansionFloors, floorUnderConstruction, freeSlots } from "../../../lib/expansion/hotelExpansionEngine";

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

// The zone summary for an amenity cell, if upgrades are enabled and the cell
// belongs to an upgradeable zone.
function upgradeZoneOf(cellType, zoneById) {
  const id = zoneForCell(cellType);
  return id ? zoneById[id] || null : null;
}

function needsAttention(state) {
  return state === "dirty" || state === "cleaning" || state === "alert";
}

export default function SchematicHotelView({
  rooms,
  staffCount,
  diagnostics,
  activeIncidents,
  decisionFeedback,
  cleaningRoomIds,
  onSelectZone,
  directActionModals = DIRECT_ACTION_MODALS,
  onPriorityClean,
  onRepairNow,
  onCallTechnician,
  repairTerms,
  hotelState,
  day = 0,
  onStartUpgrade,
  onStartFloor,
  onFitOut,
  onSetMaintenanceLevel,
  vipGuests = [],
  reservations = [],
  date,
  onVipAction,
  onMiceRespond,
}) {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);
  // Which zone's upgrade modal is open (see ZoneUpgradeModal.jsx). The
  // whole upgrade layer (level stars, works badges, the zone strip, the
  // rooftop) only exists when the caller hands in the hotel's state.
  const [upgradeZone, setUpgradeZone] = useState(null);
  // Whether the building-expansion modal is open (ExpansionModal.jsx).
  const [expansionOpen, setExpansionOpen] = useState(false);
  // The V.I.P. whose welcome modal is open (VipActionModal.jsx), by reservation.
  const [vipModalId, setVipModalId] = useState(null);
  // Whether the seminar / corporate events modal is open (MiceBookingModal.jsx).
  const [miceOpen, setMiceOpen] = useState(false);
  const entities = buildHotelSceneEntities({ rooms, staffCount, diagnostics, activeIncidents, decisionFeedback, cleaningRoomIds, includeExpansion: !!hotelState, vipRoomIds: new Set(vipGuests.map((guest) => guest.roomId)) });
  const roomEntities = entities.filter((entity) => entity.type === "room");
  const amenityEntities = entities.filter((entity) => entity.type in ZONE_STYLES && entity.type !== "room");
  // Floors built by the hotel's expansion (lib/expansion/) that have no room
  // yet still get a row -- a shell waiting to be fitted out -- and the floor
  // being built gets its own "chantier" row on top of the building.
  const newFloors = hotelState ? expansionFloors(hotelState) : [];
  const floorsByRooms = groupRoomsByFloor(roomEntities);
  const floors = [
    ...floorsByRooms,
    ...newFloors.filter((floor) => floor.status === "built" && !floorsByRooms.some(({ level }) => level === floor.level)).map((floor) => ({ level: floor.level, rooms: [] })),
  ].sort((a, b) => b.level - a.level);
  const newFloorByLevel = Object.fromEntries(newFloors.map((floor) => [floor.level, floor]));
  const construction = hotelState ? floorUnderConstruction(hotelState) : null;
  const hasMeetingRoom = !!hotelState && meetingRooms(rooms).length > 0;
  const pendingQuotes = hasMeetingRoom ? pendingRequests(hotelState, date ?? new Date()).length : 0;
  const zones = hotelState ? Object.keys(ZONES).map((zoneId) => zoneSummary(hotelState, zoneId)) : [];
  const zoneById = Object.fromEntries(zones.map((zone) => [zone.zoneId, zone]));
  const rooftop = zoneById.pool && zoneById.pool.exists ? zoneById.pool : null;
  const roomsUnderWorks = !!zoneById.rooms?.works;

  // The block's own click: always the default routing (rule #1 -- clicking
  // a room/amenity block takes the player to its management page, or calls
  // a caller-supplied `onSelectZone` instead).
  const handleSelect = (entity) => {
    if (onSelectZone) {
      onSelectZone(entity);
      return;
    }
    // A meeting room opens the seminar desk (quotes, calendar, revenue).
    if (entity.type === "room" && entity.metadata?.meeting && hotelState) {
      setMiceOpen(true);
      return;
    }
    // The room of a V.I.P. opens their welcome modal (attentions before they
    // leave) rather than the rooms page.
    const vipGuest = entity.type === "room" && entity.metadata?.vip ? vipGuests.find((guest) => guest.roomId === entity.metadata.roomId) : null;
    if (vipGuest && hotelState) {
      setVipModalId(vipGuest.reservationId);
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

      {vipGuests.length > 0 && (
        <div data-testid="schematic-vip-alert" role="status" className="flex flex-col gap-0.5 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          {vipGuests.map((guest) => (
            <p key={guest.reservationId} data-testid="schematic-vip-guest">
              <span aria-hidden="true">⭐</span> <strong>V.I.P. en séjour</strong> : {guest.guestName}, chambre {guest.roomNumber} ({guest.followers.toLocaleString("fr-FR")} abonnés), départ le {guest.departure}. Son avis pèsera ×3 sur votre réputation.
              {guest.satisfaction !== undefined && (
                <span data-testid={`schematic-vip-satisfaction-${guest.reservationId}`}> Satisfaction : {guest.satisfaction}/100.</span>
              )}{" "}
              {hotelState && (
                <button
                  type="button"
                  data-testid={`schematic-vip-welcome-${guest.reservationId}`}
                  onClick={() => setVipModalId(guest.reservationId)}
                  className="rounded border border-amber-600 px-1.5 py-0.5 font-semibold text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  Accueillir
                </button>
              )}
            </p>
          ))}
        </div>
      )}

      {zones.length > 0 && (
        <div data-testid="schematic-zones" className="flex flex-wrap gap-2" aria-label="Zones et améliorations">
          {zones.map((zone) => (
            <button
              key={zone.zoneId}
              type="button"
              data-testid={`schematic-zone-${zone.zoneId}`}
              data-level={zone.level}
              data-works={zone.works ? "true" : "false"}
              aria-label={`Améliorer ${zone.label}, niveau ${zone.level} sur ${zone.maxLevel}${zone.works ? ", en travaux" : ""}${zone.exists ? "" : ", non construit"}`}
              title={zone.exists ? `${zone.label} — niveau ${zone.level}/${zone.maxLevel}` : `${zone.label} — non construit`}
              onClick={() => setUpgradeZone(zone.zoneId)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <span aria-hidden="true">{zone.icon}</span>
              <span>{zone.label}</span>
              <span aria-hidden="true" className="tracking-tight">{levelStars(zone.level, zone.maxLevel)}</span>
              {zone.works && <span aria-hidden="true">🚧</span>}
              {!zone.exists && <span className="text-slate-400">non construit</span>}
            </button>
          ))}
          {hasMeetingRoom && (
            <button
              type="button"
              data-testid="schematic-mice"
              data-pending={pendingQuotes}
              aria-label={`Séminaires et événements pro, ${pendingQuotes} devis en attente`}
              title="Devis de séminaires et événements pro"
              onClick={() => setMiceOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <span aria-hidden="true">🤝</span>
              <span>Séminaires</span>
              {pendingQuotes > 0 && <span className="rounded-full bg-cyan-700 px-1.5 text-[10px] font-semibold text-white">{pendingQuotes}</span>}
            </button>
          )}
          <button
            type="button"
            data-testid="schematic-expansion"
            data-works={construction ? "true" : "false"}
            aria-label={`Agrandir l'hôtel${construction ? `, chantier de l'étage ${construction.level} en cours` : ""}`}
            title="Ajouter un étage et de nouvelles chambres"
            onClick={() => setExpansionOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-cyan-600 px-3 py-1 text-xs font-medium text-cyan-800 transition hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <span aria-hidden="true">🏗️</span>
            <span>Extension</span>
            {construction && <span aria-hidden="true">🚧</span>}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rooftop && (
          <div data-testid="schematic-rooftop" className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">Rooftop</span>
            <div className="relative">
              <button
                type="button"
                data-testid="schematic-amenity-pool"
                data-works={rooftop.works ? "true" : "false"}
                title={`Rooftop / Piscine — niveau ${rooftop.level}/${rooftop.maxLevel}`}
                aria-label={`Rooftop / Piscine, niveau ${rooftop.level} sur ${rooftop.maxLevel}${rooftop.works ? ", en travaux" : ""}`}
                onClick={() => setUpgradeZone("pool")}
                className={`flex h-9 w-24 flex-col items-center justify-center rounded-md text-[10px] font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${rooftop.works ? "opacity-60" : ""}`}
                style={{ backgroundColor: ZONE_STYLES.pool.color }}
              >
                <span aria-hidden="true">{ZONE_STYLES.pool.icon}</span>
                <span>{rooftop.works ? "En travaux" : "Piscine"}</span>
              </button>
            </div>
          </div>
        )}
        {construction && (
          <div data-testid="schematic-construction" data-level={construction.level} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">Étage {construction.level}</span>
            <button
              type="button"
              onClick={() => setExpansionOpen(true)}
              aria-label={`Chantier / Extension en cours, étage ${construction.level}, terminé au jour ${construction.completesOnDay}`}
              className="flex h-9 flex-1 items-center gap-2 rounded-md border-2 border-dashed border-amber-500 bg-amber-50 px-3 text-xs font-semibold text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <span aria-hidden="true">🚧</span>
              <span>Chantier / Extension en cours — terminé au jour {construction.completesOnDay}</span>
            </button>
          </div>
        )}
        {floors.map(({ level, rooms: floorRooms }) => (
          <div key={level} data-testid={`schematic-floor-${level}`} data-expansion={newFloorByLevel[level] ? "true" : undefined} className="flex items-center gap-2">
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
                      className={`flex h-9 w-14 flex-col items-center justify-center rounded-md text-[10px] font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${roomsUnderWorks ? "opacity-70" : ""}`}
                      data-works={roomsUnderWorks ? "true" : undefined}
                      style={{ backgroundColor: statusStyle.color }}
                    >
                      <span aria-hidden="true">{statusStyle.icon}</span>
                      <span>{room.metadata.number}</span>
                    </button>
                    {room.metadata.vip && (
                      <button
                        type="button"
                        data-testid={`schematic-room-${room.metadata.number}-vip`}
                        aria-label={`V.I.P. dans la chambre ${room.metadata.number}`}
                        title="V.I.P. en séjour : accueil et attentions"
                        onClick={(event) => {
                          event.stopPropagation();
                          const guest = vipGuests.find((item) => item.roomId === room.metadata.roomId);
                          if (guest && hotelState) setVipModalId(guest.reservationId);
                        }}
                        className="absolute -left-1 -top-1 text-xs leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      >
                        ⭐
                      </button>
                    )}
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
              {newFloorByLevel[level] && freeSlots(rooms, level) > 0 && (
                <button
                  type="button"
                  data-testid={`schematic-floor-${level}-fitout`}
                  onClick={() => setExpansionOpen(true)}
                  aria-label={`Aménager l'étage ${level}, ${freeSlots(rooms, level)} emplacements libres`}
                  className="flex h-9 items-center rounded-md border-2 border-dashed border-cyan-600 px-2 text-[10px] font-semibold text-cyan-800 transition hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  {floorRooms.length === 0 ? "À aménager" : "＋ chambre"} · {freeSlots(rooms, level)} libre{freeSlots(rooms, level) > 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
        ))}

        <div data-testid="schematic-ground-floor" className="flex items-center gap-2 border-t border-slate-100 pt-2">
          <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">RDC</span>
          <div className="flex flex-wrap gap-1.5">
            {amenityEntities.map((amenity) => {
              const style = zoneStyle(amenity.type);
              const alert = AMENITY_STATE_STYLES[amenity.state] || null;
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
                  {amenity.type === "reception" && vipGuests.length > 0 && (
                    <button
                      type="button"
                      data-testid="schematic-amenity-reception-vip"
                      aria-label="V.I.P. en séjour"
                      title="V.I.P. en séjour : accueil et attentions"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (hotelState) setVipModalId(vipGuests[0].reservationId);
                      }}
                      className="absolute -left-1 -top-1 text-xs leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                      ⭐
                    </button>
                  )}
                  {upgradeZoneOf(amenity.type, zoneById) && (
                    <button
                      type="button"
                      data-testid={`schematic-amenity-${amenity.type}-level`}
                      title={`Améliorer ${style.label}`}
                      aria-label={`Améliorer ${style.label}, niveau ${upgradeZoneOf(amenity.type, zoneById).level} sur ${upgradeZoneOf(amenity.type, zoneById).maxLevel}${upgradeZoneOf(amenity.type, zoneById).works ? ", en travaux" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setUpgradeZone(zoneForCell(amenity.type));
                      }}
                      className="absolute -bottom-1.5 left-0 rounded bg-white/95 px-0.5 text-[9px] leading-none shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                      {upgradeZoneOf(amenity.type, zoneById).works ? "🚧" : upgradeZoneOf(amenity.type, zoneById).level > 0 ? "⭐".repeat(upgradeZoneOf(amenity.type, zoneById).level) : "⬆️"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {upgradeZone && hotelState && (
        <ZoneUpgradeModal zoneId={upgradeZone} hotelState={hotelState} day={day} onStart={onStartUpgrade} onClose={() => setUpgradeZone(null)} />
      )}

      {miceOpen && hotelState && (
        <MiceBookingModal hotelState={hotelState} rooms={rooms} reservations={reservations} date={date} onRespond={(requestId, action) => onMiceRespond?.(requestId, action)} onClose={() => setMiceOpen(false)} />
      )}

      {vipModalId !== null && hotelState && (
        <VipActionModal
          reservationId={vipModalId}
          hotelState={hotelState}
          reservations={reservations}
          rooms={rooms}
          date={date}
          onAct={(action) => onVipAction?.(vipModalId, action)}
          onClose={() => setVipModalId(null)}
        />
      )}

      {expansionOpen && hotelState && (
        <ExpansionModal hotelState={hotelState} rooms={rooms} day={day} onStartFloor={onStartFloor} onFitOut={onFitOut} onSetMaintenanceLevel={onSetMaintenanceLevel} onClose={() => setExpansionOpen(false)} />
      )}

      {ActiveModal && (
        <ActiveModal
          entity={activeModal.entity}
          onClose={() => setActiveModal(null)}
          onPriorityClean={onPriorityClean}
          onRepairNow={onRepairNow}
          onCallTechnician={onCallTechnician}
          repairTerms={repairTerms}
        />
      )}
    </section>
  );
}
