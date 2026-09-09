import { useEffect, useRef } from "react";
import IsoFinalGrid from "./IsoFinalGrid";
import IsoFinalFloor from "./IsoFinalFloor";
import IsoFinalEntityRenderer from "./IsoFinalEntityRenderer";
import { walkCycle, cleanCycle, eatCycle } from "./IsoFinalAnimations";
import { sortEntitiesByDepth } from "../engine/DepthSort";
import { createSceneState } from "../engine/SceneState";
import { buildHotelSceneEntities, computeFloors } from "../engine/EntityFactory";
import HotelTimeline from "../v2/HotelTimeline";
import { fadeIn } from "../../animations";

// IsoFinalView -- the "Retro-Moderne Premium" isometric hotel view (see
// the Bible Artistique). Same read-only, real-data contract and exact
// same props as v3's HotelViewIsometric.jsx / RetroView.jsx (drop-in, see
// pages/Dashboard.jsx's toggle), composing all 7 room types the Bible
// asks for: chambres, réception, restaurant, cuisine, bar, laundry, hall.
//
// This view no longer interprets business data itself: it hands its props
// straight to engine/EntityFactory.js's `buildHotelSceneEntities()` (the
// only place allowed to know `room.status`/`housekeeping_status`/etc.),
// wraps the result into a normalized engine/SceneState.js `SceneState`,
// depth-sorts its entities via engine/DepthSort.js's
// `sortEntitiesByDepth()` (still the single source of truth for "what
// draws in front of what" -- render order is not JSX mount order), and
// renders each one through IsoFinalEntityRenderer.jsx, which dispatches to
// the same concrete visual components (IsoFinalRoom, IsoFinalReception,
// IsoFinalCharacter, ...) this view always used. Positions are still
// static this step -- no entity moves on its own yet (see
// EntityFactory.js/SceneState.js's own docstrings on why `previousPosition`/
// `targetPosition` exist but stay null for now).
//
// Floor labels are rendered separately, outside the sorted entity list:
// they're decorative chrome off to the side of the grid (col -1) that
// never visually overlaps a room/character/incident, so they don't need to
// compete for depth with anything, and they're not scene entities (nothing
// hovers/selects/moves a floor label).
export default function IsoFinalView({
  day,
  rooms = [],
  staffCount = 0,
  todaysEvents = [],
  diagnostics = [],
  decisionFeedback = null,
  cleaningRoomIds,
  onNextDay,
  isRunning,
}) {
  // Decision feedback (see decisionFeedback.js, reused as-is from v2):
  // staff/housekeeping already have their own real visual reaction
  // (`staffActivity` below, `cleaningRoomIds`); every other target plays
  // a cartoon cycle on the whole stage.
  const stageRef = useRef(null);

  useEffect(() => {
    if (!decisionFeedback || !stageRef.current) return;
    if (decisionFeedback.target === "staff" || decisionFeedback.target === "housekeeping") return;
    if (decisionFeedback.animation === "bounce") eatCycle(stageRef.current);
    else if (decisionFeedback.animation === "shimmer") cleanCycle(stageRef.current);
    else walkCycle(stageRef.current);
  }, [decisionFeedback]);

  // floors: decorative-only (floor number labels), never fed into the
  // scene -- see computeFloors()'s own docstring in EntityFactory.js.
  const floors = computeFloors(rooms).map((floor) => ({ level: floor.level, row: floor.floorIndex }));

  // Dashboard -> IsoFinalView -> EntityFactory -> SceneState -> render.
  // EntityFactory.js is the only place reading `room.status`/
  // `housekeeping_status`/`diagnostics[].severity`/etc.; everything from
  // here down only ever sees generic scene entities.
  const sceneState = createSceneState({
    entities: buildHotelSceneEntities({ day, rooms, staffCount, todaysEvents, diagnostics, decisionFeedback, cleaningRoomIds, isRunning }),
  });

  // DepthSort.js reads flat `{x, y, z, width, depth, height}` -- entities
  // carry those nested under `position`/`footprint` (see SceneState.js),
  // so they're flattened for the sort and the original entity is recovered
  // afterwards via `__entity`.
  const sceneEntities = sortEntitiesByDepth(
    sceneState.entities.map((entity) => ({
      x: entity.position.x,
      y: entity.position.y,
      z: entity.position.z,
      width: entity.footprint.width,
      depth: entity.footprint.depth,
      height: entity.footprint.height,
      __entity: entity,
    }))
  ).map((wrapped) => wrapped.__entity);

  return (
    <div className={`flex flex-col gap-4 ${fadeIn}`}>
      <HotelTimeline day={day} eventCount={todaysEvents.length} onNextDay={onNextDay} isRunning={isRunning} />

      <div ref={stageRef} className="rounded-[1.5rem] border-2 p-4 shadow-sm sm:p-5" style={{ borderColor: "#A7D3F233", background: "linear-gradient(180deg, #ffffff 0%, #F2A7B111 100%)" }}>
        <h2 className="mb-3 text-sm font-bold" style={{ color: "#1F2A44" }}>🏨 Vue isométrique premium de l'hôtel</h2>

        {rooms.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune chambre configurée.</p>
        ) : (
          <IsoFinalGrid>
            {floors.map((floor) => (
              <IsoFinalFloor key={`floor-label-${floor.level}`} level={floor.level} row={floor.row} rooms={[]} />
            ))}

            {sceneEntities.map((entity) => (
              <IsoFinalEntityRenderer key={entity.id} entity={entity} />
            ))}
          </IsoFinalGrid>
        )}
      </div>
    </div>
  );
}
