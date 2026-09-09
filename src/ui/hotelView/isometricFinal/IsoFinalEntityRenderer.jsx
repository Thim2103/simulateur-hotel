import IsoFinalRoom from "./IsoFinalRoom";
import IsoFinalReception from "./IsoFinalReception";
import IsoFinalRestaurant from "./IsoFinalRestaurant";
import IsoFinalKitchen from "./IsoFinalKitchen";
import IsoFinalBar from "./IsoFinalBar";
import IsoFinalLaundry from "./IsoFinalLaundry";
import IsoFinalHall from "./IsoFinalHall";
import IsoFinalCharacter from "./IsoFinalCharacter";
import IsoFinalIncident from "./IsoFinalIncident";

// The one place that knows both a generic SceneState entity's shape (see
// engine/SceneState.js) AND isometricFinal/'s own concrete visual
// components. Everything upstream of this (EntityFactory, SceneState,
// DepthSort) is domain- and view-agnostic; this dispatcher is deliberately
// the opposite -- it exists purely to keep IsoFinalView.jsx from having to
// know either side's details itself.
//
// `entity.position.x`/`.y` are already plain tile coordinates by
// construction: EntityFactory.js builds every entity's world position via
// `tileToWorld()`, which is an unrounded, direct pass-through of
// `{col, row}` (see IsoProjection.js's own docstring) -- so reading them
// back as `col`/`row` here needs no inverse projection, and critically no
// rounding, which would otherwise corrupt half-tile guest/staff positions.
// Visual components are NOT rewritten here -- same props, same components,
// same output as before this step.
export default function IsoFinalEntityRenderer({ entity }) {
  const col = entity.position.x;
  const row = entity.position.y;

  switch (entity.type) {
    case "room":
      return <IsoFinalRoom key={entity.id} col={col} row={row} state={entity.state} number={entity.metadata?.number} />;
    case "reception":
      return <IsoFinalReception key={entity.id} col={col} row={row} />;
    case "restaurant":
      return <IsoFinalRestaurant key={entity.id} col={col} row={row} />;
    case "kitchen":
      return <IsoFinalKitchen key={entity.id} col={col} row={row} />;
    case "bar":
      return <IsoFinalBar key={entity.id} col={col} row={row} />;
    case "laundry":
      return <IsoFinalLaundry key={entity.id} col={col} row={row} hasIncident={entity.state === "alert"} />;
    case "hall":
      return <IsoFinalHall key={entity.id} col={col} row={row} />;
    case "character":
      return <IsoFinalCharacter key={entity.id} kind={entity.metadata?.kind} col={col} row={row} activity={entity.activity} />;
    case "incident":
      return <IsoFinalIncident key={entity.id} col={col} row={row} type={entity.metadata?.incidentType} message={entity.metadata?.message} />;
    default:
      return null;
  }
}
