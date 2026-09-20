import { worldToScreen, tileToWorld } from "../engine/IsoProjection";
import SceneVolume from "./SceneVolume";
import { SCENE_PROJECTION, PALETTE } from "./SceneTokens";

// This step's own rendering test rig: a handful of simple geometric
// volumes (a low block, a tall block, a wide block, a stylized tree) whose
// ONLY purpose is to prove the pipeline -- projection, depth, elevation,
// shadow, camera -- works, not to look like hotel furniture. See the
// step's own "test de rendu" note. Every block renders through
// SceneVolume.jsx, the one shared box primitive this whole scene uses.
const VARIANT_COLORS = {
  blockLow: { top: "#E7B975", left: "#B98A4C", right: "#9C723C" },
  blockHigh: { top: "#8FA7D6", left: "#5F79AD", right: "#4C6392" },
  blockWide: { top: "#E28C7A", left: "#B4614F", right: "#984F40" },
};

// A stylized tree: not a rectangular volume, so it doesn't go through
// SceneVolume/buildPlatformShape() -- a round canopy over a short trunk,
// anchored at its own tile's center (`+0.5`, matching every ambient
// character's own half-tile centering, see EntityFactory.js's
// `guestTile()`/`staffTile()`) and elevated the same way a block is
// (world `elevation`, via IsoProjection -- never a screen offset).
function SceneTree({ tile, elevation }) {
  const screen = worldToScreen(tileToWorld({ col: tile.col + 0.5, row: tile.row + 0.5, elevation }), SCENE_PROJECTION);

  return (
    <div
      data-testid="scene-object"
      data-variant="tree"
      className="absolute flex flex-col items-center"
      style={{ left: screen.x, top: screen.y, transform: "translate(-50%, -100%)" }}
    >
      <div
        aria-hidden="true"
        className="rounded-full"
        style={{ width: 46, height: 46, background: "radial-gradient(circle at 35% 30%, #9ED37A, #4E8A3B)", boxShadow: `0 6px 10px ${PALETTE.shadow}` }}
      />
      <div aria-hidden="true" style={{ width: 8, height: 20, background: "linear-gradient(#8A5A3B, #6E4530)", borderRadius: 2 }} />
    </div>
  );
}

export default function SceneObject({ tile, elevation = 0, footprint = { width: 1, depth: 1, height: 1 }, variant = "blockLow" }) {
  if (variant === "tree") return <SceneTree tile={tile} elevation={elevation} />;
  const colors = VARIANT_COLORS[variant] ?? VARIANT_COLORS.blockLow;
  return (
    <SceneVolume tile={tile} elevation={elevation} footprint={footprint} colors={colors} testId="scene-object" dataAttrs={{ "data-variant": variant }} />
  );
}
