import { shadeHexColor, buildFaceColors, LIGHT_FACTORS } from "./SceneLighting";

describe("SceneLighting / shadeHexColor", () => {
  it("returns the same color at factor 1", () => {
    expect(shadeHexColor("#8FCB6B", 1)).toBe("#8fcb6b");
  });

  it("darkens every channel proportionally for a factor below 1", () => {
    expect(shadeHexColor("#ffffff", 0.5)).toBe("#808080");
  });

  it("never goes below 0 or above 255 per channel", () => {
    expect(shadeHexColor("#000000", 2)).toBe("#000000");
    expect(shadeHexColor("#ffffff", 10)).toBe("#ffffff");
  });
});

describe("SceneLighting / buildFaceColors", () => {
  it("produces a top/left/right triple where top is brightest and right is darkest", () => {
    const colors = buildFaceColors("#ffffff");
    const luminance = (hex) => parseInt(hex.slice(1, 3), 16);
    expect(luminance(colors.top)).toBeGreaterThan(luminance(colors.left));
    expect(luminance(colors.left)).toBeGreaterThan(luminance(colors.right));
  });

  it("applies the SAME shared factors every call -- one consistent light source", () => {
    const a = buildFaceColors("#ff0000");
    const b = buildFaceColors("#00ff00");
    expect(shadeHexColor("#ff0000", LIGHT_FACTORS.left)).toBe(a.left);
    expect(shadeHexColor("#00ff00", LIGHT_FACTORS.left)).toBe(b.left);
  });
});
