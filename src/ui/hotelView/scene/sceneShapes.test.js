import { buildPlatformShape } from "./sceneShapes";

describe("sceneShapes / buildPlatformShape", () => {
  const top = { x: 100, y: 0 };
  const right = { x: 200, y: 50 };
  const bottom = { x: 100, y: 100 };
  const left = { x: 0, y: 50 };

  it("sizes the bounding box to the diamond plus the wall depth", () => {
    const shape = buildPlatformShape(top, right, bottom, left, 20);
    expect(shape.width).toBe(200); // right.x - left.x
    expect(shape.height).toBe(120); // (bottom.y - top.y) + depth
    expect(shape.originX).toBe(0);
    expect(shape.originY).toBe(0);
  });

  it("produces three distinct, non-empty clip-path polygons", () => {
    const shape = buildPlatformShape(top, right, bottom, left, 20);
    expect(shape.topFace).toMatch(/^polygon\(/);
    expect(shape.leftFace).toMatch(/^polygon\(/);
    expect(shape.rightFace).toMatch(/^polygon\(/);
    expect(shape.topFace).not.toBe(shape.leftFace);
    expect(shape.leftFace).not.toBe(shape.rightFace);
  });

  it("a zero depth still produces a valid (zero-height) wall polygon", () => {
    expect(() => buildPlatformShape(top, right, bottom, left, 0)).not.toThrow();
  });

  it("translates consistently regardless of where the corners sit on screen", () => {
    const offset = (p) => ({ x: p.x + 500, y: p.y + 300 });
    const shapeA = buildPlatformShape(top, right, bottom, left, 20);
    const shapeB = buildPlatformShape(offset(top), offset(right), offset(bottom), offset(left), 20);
    // Same shape, just relocated -- the RELATIVE polygon strings must be identical.
    expect(shapeB.topFace).toBe(shapeA.topFace);
    expect(shapeB.width).toBe(shapeA.width);
    expect(shapeB.height).toBe(shapeA.height);
    expect(shapeB.originX).toBe(shapeA.originX + 500);
    expect(shapeB.originY).toBe(shapeA.originY + 300);
  });
});
