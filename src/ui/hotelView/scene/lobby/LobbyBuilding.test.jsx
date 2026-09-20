import { render, screen, fireEvent } from "@testing-library/react";
import LobbyBuilding from "./LobbyBuilding";
import { worldToScreen, tileToWorld } from "../../engine/IsoProjection";
import { SCENE_PROJECTION, BUILDING } from "../SceneTokens";

const TILE = { col: 2, row: 1 };

describe("LobbyBuilding / presence -- a real hotel space, not a primitive demo", () => {
  it("renders the structural shell: floor, both solid walls, four corner columns, roof, windows", () => {
    render(<LobbyBuilding tile={TILE} />);
    expect(screen.getByTestId("lobby-building")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-floor")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-wall-north")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-wall-west")).toBeInTheDocument();
    ["nw", "ne", "sw", "se"].forEach((corner) => expect(screen.getByTestId(`lobby-column-${corner}`)).toBeInTheDocument());
    expect(screen.getByTestId("lobby-roof")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-window-north-left-glass")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-window-north-right-glass")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-window-west-glass")).toBeInTheDocument();
  });

  it("renders the entrance: steps, pillars, awning, sign, mat, flanking plants, a lamp -- no south wall panel", () => {
    render(<LobbyBuilding tile={TILE} />);
    expect(screen.getByTestId("lobby-entrance-step")).toBeInTheDocument();
    expect(screen.getAllByTestId("lobby-entrance-pillar")).toHaveLength(2);
    expect(screen.getByTestId("lobby-entrance-awning")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-entrance-sign")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-entrance-mat")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-entrance-plant-left-foliage")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-entrance-plant-right-foliage")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-entrance-lamp-post")).toBeInTheDocument();
    // No south (entrance-side) or east (future-corridor-side) wall panel --
    // this building only ever creates "lobby-wall-north"/"lobby-wall-west".
    expect(screen.queryByTestId("lobby-wall-south")).not.toBeInTheDocument();
    expect(screen.queryByTestId("lobby-wall-east")).not.toBeInTheDocument();
  });

  it("renders the reception: counter, shelf, screen, lamp", () => {
    render(<LobbyBuilding tile={TILE} />);
    expect(screen.getByTestId("lobby-reception-counter")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-reception-shelf")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-reception-screen")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-reception-lamp")).toBeInTheDocument();
  });

  it("renders the seating/furniture group: rug, table, two chairs, a lamp, a plant, luggage", () => {
    render(<LobbyBuilding tile={TILE} />);
    expect(screen.getByTestId("lobby-rug")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-table")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-chair-1")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-chair-2")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-lamp-post")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-plant-foliage")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-luggage")).toBeInTheDocument();
  });
});

describe("LobbyBuilding / footprint, position and scale", () => {
  it("positions its north wall using IsoProjection at the building's own anchor tile -- not a pixel offset", () => {
    render(<LobbyBuilding tile={TILE} />);
    const wall = screen.getByTestId("lobby-wall-north");
    const topCorner = worldToScreen(tileToWorld({ col: TILE.col, row: TILE.row, elevation: 0 }), SCENE_PROJECTION);
    expect(parseFloat(wall.style.left)).toBeLessThanOrEqual(topCorner.x + 1);
  });

  it("the wall's own world width matches BUILDING's own centralized footprint", () => {
    const { container: defaultBuilding } = render(<LobbyBuilding tile={TILE} />);
    const { container: customBuilding } = render(<LobbyBuilding tile={TILE} dimensions={{ ...BUILDING, width: 12, depth: 8 }} />);
    const defaultWidth = parseFloat(defaultBuilding.querySelector('[data-testid="lobby-wall-north"]').style.width);
    const customWidth = parseFloat(customBuilding.querySelector('[data-testid="lobby-wall-north"]').style.width);
    expect(customWidth).toBeGreaterThan(defaultWidth);
  });

  it("the reception counter fits well within the room -- narrower than the lobby's own width", () => {
    render(<LobbyBuilding tile={TILE} />);
    const counterWidth = parseFloat(screen.getByTestId("lobby-reception-counter").style.width);
    const wallWidth = parseFloat(screen.getByTestId("lobby-wall-north").style.width);
    expect(counterWidth).toBeLessThan(wallWidth);
  });

  it("the roof overhangs the walls -- a wider bounding box than the wall it caps", () => {
    render(<LobbyBuilding tile={TILE} />);
    const roofWidth = parseFloat(screen.getByTestId("lobby-roof").style.width);
    const wallWidth = parseFloat(screen.getByTestId("lobby-wall-north").style.width);
    expect(roofWidth).toBeGreaterThan(wallWidth);
  });
});

describe("LobbyBuilding / materials", () => {
  it("uses different materials for the wall vs. the reception counter -- never the same ad hoc color", () => {
    render(<LobbyBuilding tile={TILE} />);
    const wallTopFace = screen.getByTestId("lobby-wall-north").querySelector(".absolute.inset-0:last-child");
    const counterTopFace = screen.getByTestId("lobby-reception-counter").querySelector(".absolute.inset-0:last-child");
    expect(wallTopFace.style.background).not.toBe(counterTopFace.style.background);
  });
});

describe("LobbyBuilding / interaction states", () => {
  it("exposes hovered/selected state on its own root element", () => {
    render(<LobbyBuilding tile={TILE} isHovered isSelected={false} />);
    expect(screen.getByTestId("lobby-building").dataset.hovered).toBe("true");
    expect(screen.getByTestId("lobby-building").dataset.selected).toBe("false");
  });

  it("shows no halo when neither hovered nor selected, and one when either is true", () => {
    const { rerender } = render(<LobbyBuilding tile={TILE} />);
    expect(screen.queryByTestId("lobby-halo")).not.toBeInTheDocument();

    rerender(<LobbyBuilding tile={TILE} isHovered />);
    expect(screen.getByTestId("lobby-halo")).toBeInTheDocument();

    rerender(<LobbyBuilding tile={TILE} isSelected />);
    expect(screen.getByTestId("lobby-halo")).toBeInTheDocument();
  });

  it("clicking/hovering the north wall calls onSelect/onHover", () => {
    const onSelect = jest.fn();
    const onHover = jest.fn();
    render(<LobbyBuilding tile={TILE} onSelect={onSelect} onHover={onHover} />);
    const wall = screen.getByTestId("lobby-wall-north");
    fireEvent.mouseEnter(wall);
    expect(onHover).toHaveBeenCalledWith(true);
    fireEvent.click(wall);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("the reception counter ALSO reflects the building's own interaction state (it shares the same hover target)", () => {
    render(<LobbyBuilding tile={TILE} isHovered />);
    expect(screen.getByTestId("lobby-reception-counter").dataset.state).toBe("hovered");
  });
});

describe("LobbyBuilding / accessibility", () => {
  it("the building carries an aria-label, and the reception/sign carry their own", () => {
    render(<LobbyBuilding tile={TILE} />);
    expect(screen.getByTestId("lobby-building")).toHaveAttribute("aria-label");
    expect(screen.getByTestId("lobby-reception-counter")).toHaveAttribute("aria-label", "Réception");
    expect(screen.getByTestId("lobby-entrance-sign")).toHaveAttribute("aria-label");
  });
});

describe("LobbyBuilding / depth sorting", () => {
  it("never relies on JSX order -- the reception (near the back wall) draws before the seating group (deeper into the room)", () => {
    render(<LobbyBuilding tile={TILE} />);
    const building = screen.getByTestId("lobby-building");
    const domOrder = Array.from(building.children)
      .map((el) => el.getAttribute("data-testid"))
      .filter(Boolean);
    expect(domOrder.indexOf("lobby-reception-counter")).toBeLessThan(domOrder.indexOf("lobby-rug"));
    expect(domOrder.indexOf("lobby-floor")).toBeLessThan(domOrder.indexOf("lobby-reception-counter"));
  });

  it("depth-sorts consistently regardless of the order buildLobby*Parts happen to be called in -- it is a real sort, not incidental JSX order", () => {
    render(<LobbyBuilding tile={TILE} />);
    const building = screen.getByTestId("lobby-building");
    const domOrder = Array.from(building.children).map((el) => el.getAttribute("data-testid"));
    // The roof (elevation = wallHeight, spanning the whole footprint) has a
    // LARGER depth key than the floor (elevation 0, same footprint) --
    // z is part of DepthSort.js's own key -- so it must always draw after.
    expect(domOrder.indexOf("lobby-roof")).toBeGreaterThan(domOrder.indexOf("lobby-floor"));
  });
});
