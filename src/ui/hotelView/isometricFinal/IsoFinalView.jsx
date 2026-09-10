import { useEffect, useMemo, useRef, useState } from "react";
import IsoFinalGrid, { ISO_FINAL_PROJECTION, GRID_SIZE } from "./IsoFinalGrid";
import IsoFinalFloor from "./IsoFinalFloor";
import IsoFinalEntityRenderer from "./IsoFinalEntityRenderer";
import { walkCycle, cleanCycle, eatCycle } from "./IsoFinalAnimations";
import { sortEntitiesByDepth } from "../engine/DepthSort";
import { createSceneState } from "../engine/SceneState";
import { buildHotelSceneEntities, computeFloors } from "../engine/EntityFactory";
import { tileToWorld } from "../engine/IsoProjection";
import { beginPath } from "../engine/PathFollower";
import { useSceneEngine } from "../engine/useSceneEngine";
import { createCamera, resetCamera } from "../engine/Camera";
import SceneCamera from "../scene/SceneCamera";
import { buildDemoPath } from "../scene/DemoPathScenario";
import { AMENITY_LAYOUT } from "../scene/HotelSceneLayout";
import HotelTimeline from "../v2/HotelTimeline";
import { fadeIn } from "../../animations";

// Step 4 (camera): the scene's own viewport, deliberately smaller than the
// full grid -- see scene/SceneCamera.jsx's own docstring. World bounds are
// expressed in TILE units (the same space every room/amenity tile already
// lives in, see scene/HotelSceneLayout.js), a couple of tiles wider than
// the grid on every side so the hotel can be panned right up to its own
// edge without ever going fully off-screen.
const CAMERA_VIEWPORT_WIDTH = 900;
const CAMERA_VIEWPORT_HEIGHT = 480;
const CAMERA_WORLD_BOUNDS = { minX: -2, maxX: GRID_SIZE + 2, minY: -2, maxY: GRID_SIZE + 2 };

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
// IsoFinalCharacter, ...) this view always used. Almost every entity's
// position is still static (EntityFactory only ever computes one fixed
// position per render) -- see the "Step 4 demo scenario" note below for
// the one entity that isn't.
//
// Floor labels are rendered separately, outside the sorted entity list:
// they're decorative chrome off to the side of the grid (col -1) that
// never visually overlaps a room/character/incident, so they don't need to
// compete for depth with anything, and they're not scene entities (nothing
// hovers/selects/moves a floor label).
//
// Step 4 demo scenario: exactly ONE already-existing character entity (the
// first one EntityFactory produces, guest or staff) is additionally driven
// by engine/useSceneEngine.js (SceneLoop + PathFollower + MotionSystem)
// along a real, pathfound, multi-waypoint route -- Réception -> (a one-tile
// detour around a deliberate obstacle, see scene/DemoPathScenario.js) ->
// Hall -> a room -- rather than a single straight hop. World coordinates
// come from IsoProjection, the route itself from Grid.js +
// PathfindingService.js, the walk from PathFollower.js/MotionSystem.js:
// this is the full pipeline "world coordinates -> pathfinding -> waypoints
// -> motion -> depth sorting -> rendering" in one demonstration. See
// useSceneEngine.js's own docstring for why that entity/path is captured
// once, at mount, rather than re-derived every render like the rest of the
// (still fully static) scene. Every other entity is untouched by this.
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

  // Step 4 (camera): the scene's own pan/zoom state, entirely separate
  // from `sceneState` above -- panning/zooming never touches a single
  // entity's position (see engine/Camera.js's own docstring); it only
  // changes what part of the already-rendered scene is visible.
  const [camera, setCamera] = useState(() =>
    createCamera({
      x: GRID_SIZE / 2,
      y: GRID_SIZE / 2,
      zoom: 1,
      minZoom: 0.5,
      maxZoom: 2.5,
      viewportWidth: CAMERA_VIEWPORT_WIDTH,
      viewportHeight: CAMERA_VIEWPORT_HEIGHT,
      worldBounds: CAMERA_WORLD_BOUNDS,
    })
  );
  const handleResetCamera = () => setCamera((current) => resetCamera(current));

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
  const businessEntities = buildHotelSceneEntities({ day, rooms, staffCount, todaysEvents, diagnostics, decisionFeedback, cleaningRoomIds, isRunning });

  // Step 4 demo scenario (see this file's own docstring above): pick the
  // first character entity and the target room (room 101 if the current
  // hotel happens to have one, otherwise the first room -- deterministic
  // either way for a given `rooms` prop), and send that one character
  // walking the demo's pathfound Réception -> Hall -> room route.
  const testCharacterSource = businessEntities.find((entity) => entity.type === "character") ?? null;
  const demoRoomEntity = businessEntities.find((entity) => entity.type === "room" && entity.metadata?.number === "101") ?? businessEntities.find((entity) => entity.type === "room") ?? null;

  const testMotionEntities = useMemo(() => {
    if (!testCharacterSource || !demoRoomEntity) return [];
    const receptionTile = { col: AMENITY_LAYOUT.reception.col, row: AMENITY_LAYOUT.reception.row };
    const startingAtReception = { ...testCharacterSource, position: tileToWorld(receptionTile) };
    const { waypoints } = buildDemoPath(demoRoomEntity);
    // The path's own first point IS the character's starting position
    // (réception) -- beginPath()'s own contract is "waypoints AFTER the
    // current position", so it's dropped here.
    return [beginPath(startingAtReception, waypoints.slice(1), 1.5)];
    // Captured once at mount on purpose -- see useSceneEngine.js's own
    // docstring on why its initial entities aren't re-derived every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const motionEngine = useSceneEngine(testMotionEntities);

  useEffect(() => {
    motionEngine.start();
    return () => motionEngine.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveTestEntity = motionEngine.sceneState.entities[0] ?? null;
  const entities = liveTestEntity
    ? businessEntities.map((entity) => (entity.id === liveTestEntity.id ? liveTestEntity : entity))
    : businessEntities;

  const sceneState = createSceneState({ entities });

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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ color: "#1F2A44" }}>🏨 Vue isométrique premium de l'hôtel</h2>
          {rooms.length > 0 && (
            <button
              type="button"
              onClick={handleResetCamera}
              className="rounded-md border px-2 py-1 text-xs font-semibold"
              style={{ borderColor: "#A7D3F266", color: "#1F2A44" }}
            >
              🎯 Recentrer
            </button>
          )}
        </div>

        {rooms.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune chambre configurée.</p>
        ) : (
          <SceneCamera
            camera={camera}
            onCameraChange={setCamera}
            projectionParams={ISO_FINAL_PROJECTION}
            className="mx-auto rounded-2xl"
            style={{ width: CAMERA_VIEWPORT_WIDTH, height: CAMERA_VIEWPORT_HEIGHT, maxWidth: "100%" }}
          >
            <IsoFinalGrid>
              {floors.map((floor) => (
                <IsoFinalFloor key={`floor-label-${floor.level}`} level={floor.level} row={floor.row} rooms={[]} />
              ))}

              {sceneEntities.map((entity) => (
                <IsoFinalEntityRenderer key={entity.id} entity={entity} />
              ))}
            </IsoFinalGrid>
          </SceneCamera>
        )}
      </div>
    </div>
  );
}
