import { useCallback, useMemo, useState } from "react";
import { createCamera, fitWorldToViewport, panBy } from "../engine/Camera";
import { sortEntitiesByDepth } from "../engine/DepthSort";
import { getEntityAtTile } from "../engine/WorldEntities";
import { getWorldBounds } from "../engine/WorldBounds";
import SceneCamera from "./SceneCamera";
import SceneTerrainBase from "./SceneTerrainBase";
import SceneGrid, { tileKey } from "./SceneGrid";
import LobbyBuilding from "./lobby/LobbyBuilding";
import { IsoPath, IsoColumn } from "./primitives/IsoArchitecture";
import { IsoLamp, IsoBench } from "./primitives/IsoDecor";
import { IsoTree, IsoRock, IsoFence } from "./primitives/IsoEnvironment";
import { SCENE_PROJECTION, PALETTE, BUILDING, SCALE } from "./SceneTokens";

// The new isometric "playfield" -- the future main game view. Deliberately
// standalone: it takes NO hotel business props (no rooms, no career state,
// no KPIs) and works purely off engine/ primitives (Camera, DepthSort,
// WorldEntities) plus its own scene/ rendering pieces -- see this step's
// own "doit pouvoir fonctionner indépendamment" requirement.
// IsoFinalView.jsx is untouched and stays the default view; this is
// reachable only experimentally (see pages/Dashboard.jsx's own toggle)
// until this scene is validated.
//
// Composition, strictly one direction:
//   world bounds -> Camera (pan/zoom/fit) -> SceneCamera (interaction +
//   transform) -> SceneTerrainBase (the platform) -> SceneGrid (discrete
//   hover/select cells) -> the lobby building + primitive showcase,
//   depth-sorted via engine/DepthSort.js.
// No simulation/business logic anywhere in this file or its children.
// Enlarged for Étape 7's own 8x6 lobby (see BUILDING in SceneTokens.js) --
// big enough for the lobby plus a clear margin and the primitive showcase
// garden, without either crowding the other.
const WORLD_BOUNDS = { minCol: 0, maxCol: 15, minRow: 0, maxRow: 12 };
// Same-shaped bounds, in WORLD units, for Camera.js (which speaks world
// x/y, not tile col/row -- identical numbers here only because
// IsoProjection.tileToWorld() is an unrounded 1:1 pass-through, see its
// own docstring). This is the TERRAIN's own rectangle only -- the camera's
// actual fit/clamp bounds are `getWorldBounds()`'s own result below, which
// also accounts for every entity's footprint (see WorldBounds.js's own
// docstring on why that can differ from the terrain rectangle alone).
const WORLD_BOUNDS_XY = { minX: WORLD_BOUNDS.minCol, maxX: WORLD_BOUNDS.maxCol, minY: WORLD_BOUNDS.minRow, maxY: WORLD_BOUNDS.maxRow };

// Fallback viewport size, used ONLY for the camera's very first render --
// before SceneCamera.jsx's own `ResizeObserver` has reported the
// container's real DOM size (see this component's own `handleViewportResize`
// below). Never the operational viewport: once that first real
// measurement arrives, it replaces these numbers entirely.
const FALLBACK_VIEWPORT_WIDTH = 1400;
const FALLBACK_VIEWPORT_HEIGHT = 760;
const CAMERA_PADDING_PX = 48;

// ÉTAPE 7: the lobby -- the hotel's first REAL space (not a reference
// building anymore, see LobbyBuilding.jsx's own docstring), placed purely
// in world tile coordinates. `metadata.subtype: "lobby"` is this
// building's own spatial identity (see this step's own "entité du monde"
// requirement) -- a future room places its own building entity the exact
// same way, with its own `subtype`.
const LOBBY_TILE = { col: 2, row: 1 };
const LOBBY_ENTITY = {
  id: "building:lobby",
  type: "building",
  position: { x: LOBBY_TILE.col, y: LOBBY_TILE.row, z: 0 },
  footprint: { width: BUILDING.width, depth: BUILDING.depth, height: BUILDING.wallHeight + BUILDING.roofHeight },
  metadata: { subtype: "lobby" },
};

// A small, self-contained showcase of the scene/primitives/*.jsx catalog
// (Étape "langage visuel") -- a path, a tree, a rock, a bench, a column
// and a short fence run, kept in its own corner well clear of the lobby
// so the two never visually collide, purely to keep proving the whole
// primitive catalog reads as one coherent visual language alongside a
// real building.
const PRIMITIVE_SHOWCASE = [
  { id: "showcase:fence-1", type: "primitive", position: { x: 12, y: 8, z: 0 }, footprint: { width: 1, depth: SCALE.WALL_THICKNESS, height: SCALE.FENCE_HEIGHT }, metadata: { kind: "fence" } },
  { id: "showcase:fence-2", type: "primitive", position: { x: 13, y: 8, z: 0 }, footprint: { width: 1, depth: SCALE.WALL_THICKNESS, height: SCALE.FENCE_HEIGHT }, metadata: { kind: "fence" } },
  { id: "showcase:column", type: "primitive", position: { x: 14, y: 8, z: 0 }, footprint: { width: 0.12, depth: 0.12, height: SCALE.COLUMN_HEIGHT }, metadata: { kind: "column" } },
  { id: "showcase:lamp", type: "primitive", position: { x: 12, y: 9, z: 0 }, footprint: { width: 0.08, depth: 0.08, height: 0.87 }, metadata: { kind: "lamp" } },
  { id: "showcase:path", type: "primitive", position: { x: 13, y: 9, z: 0 }, footprint: { width: 2, depth: 1, height: SCALE.FLOOR_THICKNESS }, metadata: { kind: "path" } },
  { id: "showcase:tree", type: "primitive", position: { x: 12, y: 10, z: 0 }, footprint: { width: 1, depth: 1, height: 1.2 }, metadata: { kind: "tree" } },
  { id: "showcase:rock", type: "primitive", position: { x: 13, y: 10, z: 0 }, footprint: { width: 0.4, depth: 0.35, height: 0.22 }, metadata: { kind: "rock" } },
  { id: "showcase:bench", type: "primitive", position: { x: 14, y: 10, z: 0 }, footprint: { width: 0.16, depth: 0.55, height: SCALE.FURNITURE_HEIGHT }, metadata: { kind: "bench" } },
];

// Dispatches one showcase entity's `metadata.kind` to its own primitive
// component -- the one place that maps "which primitive" to "which
// component", exactly like IsoFinalEntityRenderer.jsx already does for
// isometricFinal/'s own entities.
function renderPrimitiveShowcaseItem(kind, tile) {
  switch (kind) {
    case "fence":
      return <IsoFence tile={tile} width={1} />;
    case "column":
      return <IsoColumn tile={tile} />;
    case "lamp":
      return <IsoLamp tile={tile} />;
    case "path":
      return <IsoPath tile={tile} width={2} depth={1} />;
    case "tree":
      return <IsoTree tile={tile} />;
    case "rock":
      return <IsoRock tile={tile} />;
    case "bench":
      return <IsoBench tile={tile} />;
    default:
      return null;
  }
}

export default function HotelScene() {
  const ALL_ENTITIES = [LOBBY_ENTITY, ...PRIMITIVE_SHOWCASE];

  // The camera's real fit/clamp bounds: terrain rectangle UNION every
  // entity's own footprint (see WorldBounds.js's own docstring) --
  // computed once, since ALL_ENTITIES/WORLD_BOUNDS_XY are static for this
  // step.
  const worldBounds = useMemo(() => getWorldBounds({ terrainBounds: WORLD_BOUNDS_XY, entities: ALL_ENTITIES }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Camera: starts with a FALLBACK viewport size (see
  // FALLBACK_VIEWPORT_WIDTH/HEIGHT's own comment) -- not yet correctly
  // framed, because the real DOM size isn't known until SceneCamera.jsx's
  // own `ResizeObserver` reports it, which happens in
  // `handleViewportResize` below, on the very next paint. `resetCamera()`
  // (a DIFFERENT, deliberately unused concept here -- see Camera.js's own
  // docstring) would only ever return to this same rough fallback; this
  // scene's "Recentrer" button calls `fitWorldToViewport()` directly
  // instead (see `handleRecenter` below), which is the one that actually
  // matters.
  const [camera, setCamera] = useState(() =>
    createCamera({
      minZoom: 0.35,
      maxZoom: 2.5,
      viewportWidth: FALLBACK_VIEWPORT_WIDTH,
      viewportHeight: FALLBACK_VIEWPORT_HEIGHT,
      worldBounds,
    })
  );

  // SceneCamera.jsx's own ResizeObserver callback -- the single source of
  // truth for "what is the container's real size right now":
  //   - the FIRST call ever (`isInitial`, right after mount) -- the scene
  //     has never been framed against a real size yet, so this is exactly
  //     the "INITIAL LOAD -> auto-fit" moment: a full fitWorldToViewport().
  //   - every call AFTER that (an actual window/panel resize) only updates
  //     the camera's own viewportWidth/Height and re-applies world-bounds
  //     clamping (via `panBy(camera, 0, 0, ...)`, a pure no-op pan that
  //     still runs Camera.js's own clamp-to-bounds logic) -- the user's
  //     current pan/zoom is deliberately PRESERVED, only pulled back
  //     inside the world bounds if the new viewport size would otherwise
  //     let it drift off-screen. This is NOT a full re-fit on every
  //     resize (that would yank the camera out from under a player mid-
  //     interaction) -- see this step's own "ne déclenche pas un auto-fit
  //     brutal à chaque micro changement" note.
  const handleViewportResize = useCallback(
    (size, { isInitial }) => {
      setCamera((current) => {
        const sized = { ...current, viewportWidth: size.width, viewportHeight: size.height };
        return isInitial ? fitWorldToViewport(sized, worldBounds, SCENE_PROJECTION, CAMERA_PADDING_PX) : panBy(sized, 0, 0, SCENE_PROJECTION);
      });
    },
    [worldBounds]
  );

  // "Recentrer": a full fitWorldToViewport() against the CURRENT real
  // viewport size (kept live by handleViewportResize above) and the
  // current world bounds -- NOT resetCamera(). Works from any prior camera
  // state (panned far away, zoomed all the way in/out...) because it never
  // reads the camera's own x/y/zoom as an input to the computation, only
  // its viewportWidth/Height (see Camera.js's own fitWorldToViewport()).
  const handleRecenter = useCallback(() => {
    setCamera((current) => fitWorldToViewport(current, worldBounds, SCENE_PROJECTION, CAMERA_PADDING_PX));
  }, [worldBounds]);

  // Hover/selection: identified purely by TILE `{col, row}` (see this
  // step's own "et non par des coordonnées DOM" requirement) -- never a
  // pixel position.
  const [hoveredTile, setHoveredTile] = useState(null);
  const [selectedTile, setSelectedTile] = useState(null);

  // The lobby's own selected/hovered/highlighted state (see this step's
  // own "hôtel = objet de jeu" requirement) -- separate from the grid's
  // tile hover/selection above: a building is its own selectable object,
  // not a tile.
  const [isLobbyHovered, setIsLobbyHovered] = useState(false);
  const [isLobbySelected, setIsLobbySelected] = useState(false);

  // Which tiles currently hold something, using engine/WorldEntities.js's
  // own `getEntityAtTile()` -- a first, minimal, real use of the placement
  // API this step prepares (see its own docstring): NOT a construction
  // mode, just occupancy read for the grid overlay's "libre/occupé" state.
  const occupiedTiles = useMemo(() => {
    const occupied = new Set();
    for (let row = WORLD_BOUNDS.minRow; row <= WORLD_BOUNDS.maxRow; row += 1) {
      for (let col = WORLD_BOUNDS.minCol; col <= WORLD_BOUNDS.maxCol; col += 1) {
        if (getEntityAtTile(ALL_ENTITIES, { col, row })) occupied.add(tileKey(col, row));
      }
    }
    return occupied;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Depth-sorted once (the lobby -- treated as ONE entity spanning its own
  // footprint, see LobbyBuilding.jsx for its OWN internal depth-sort of its
  // sub-parts -- + the primitive showcase) -- same engine/DepthSort.js
  // every other isometric view in this codebase uses, flattened the same
  // way IsoFinalView.jsx's own SceneState entities are (see its own
  // comment on why: DepthSort reads flat `{x,y,z,width,depth,height}`).
  const sortedObjects = sortEntitiesByDepth(
    ALL_ENTITIES.map((entity) => ({
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
    <div className="flex flex-col gap-2" style={{ background: `linear-gradient(180deg, ${PALETTE.skyTop}, ${PALETTE.skyBottom})`, borderRadius: 24, padding: 16 }}>
      {/* Reserved for a future top HUD (KPIs, day/night, alerts) -- empty on
          purpose this step, see the step's own "prévoir un espace" note. */}
      <div data-testid="hud-top-slot" className="flex items-center justify-between px-2 text-xs font-semibold" style={{ color: PALETTE.ink }}>
        <span>🏝️ Nouveau monde isométrique -- prototype technique</span>
        <button
          type="button"
          onClick={handleRecenter}
          className="rounded-md border px-2 py-1 text-xs font-semibold"
          style={{ borderColor: "rgba(35,50,25,0.3)", color: PALETTE.ink, background: "rgba(255,255,255,0.5)" }}
        >
          🎯 Recentrer
        </button>
      </div>

      <div className="flex gap-2">
        {/* Reserved for a future contextual side panel -- empty on purpose. */}
        <div data-testid="hud-side-slot" className="hidden w-0" />

        {/* The viewport itself: responsive on purpose -- NO fixed 1400px
            width here (that was this step's own bug, see HotelScene.jsx's
            module-level comments). `width: 100%` lets it fill whatever
            column the Dashboard actually gives it; `clamp()` gives the
            height a sensible responsive range without an arbitrary fixed
            number. SceneCamera.jsx measures whatever this actually renders
            at via ResizeObserver -- this is only CSS sizing, never camera
            math. */}
        <SceneCamera
          camera={camera}
          onCameraChange={setCamera}
          onViewportResize={handleViewportResize}
          projectionParams={SCENE_PROJECTION}
          className="w-full overflow-hidden rounded-2xl"
          style={{ height: "clamp(360px, 70vh, 760px)" }}
        >
          <div className="relative" style={{ width: 1, height: 1 }}>
            <SceneTerrainBase bounds={WORLD_BOUNDS} />
            <SceneGrid
              bounds={WORLD_BOUNDS}
              hoveredTile={hoveredTile}
              selectedTile={selectedTile}
              occupiedTiles={occupiedTiles}
              onHoverTile={setHoveredTile}
              onSelectTile={(tile) => setSelectedTile((current) => (current?.col === tile.col && current?.row === tile.row ? null : tile))}
            />
            {sortedObjects.map((entity) => {
              const tile = { col: entity.position.x, row: entity.position.y };
              if (entity.type === "building") {
                return (
                  <LobbyBuilding
                    key={entity.id}
                    tile={tile}
                    isHovered={isLobbyHovered}
                    isSelected={isLobbySelected}
                    onHover={setIsLobbyHovered}
                    onSelect={() => setIsLobbySelected((current) => !current)}
                  />
                );
              }
              return <span key={entity.id}>{renderPrimitiveShowcaseItem(entity.metadata.kind, tile)}</span>;
            })}
          </div>
        </SceneCamera>
      </div>

      {/* Reserved for a future bottom action bar / event feed -- a live
          tile readout stands in for it this step, purely for manual
          validation (see the step's own "voir la cellule ciblée" note). */}
      <div data-testid="hud-bottom-slot" className="px-2 text-xs" style={{ color: PALETTE.ink }}>
        {hoveredTile ? `Cellule survolée : (${hoveredTile.col}, ${hoveredTile.row})` : "Survolez une cellule du terrain"}
        {selectedTile ? ` · Sélectionnée : (${selectedTile.col}, ${selectedTile.row})` : ""}
      </div>
    </div>
  );
}
