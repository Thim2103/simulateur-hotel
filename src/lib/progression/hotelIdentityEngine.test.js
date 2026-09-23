import { invest } from "./positioningEngine";
import { hotelIdentity, DEFAULT_TITLE } from "./hotelIdentityEngine";

const hotel = () => ({ finance: { revenue: [50000], costs: [0] }, expansion: { availableCapital: 0 } });

test("a hotel that never invested reads as 'Ma Première Auberge's own starting identity", () => {
  const identity = hotelIdentity(hotel());
  expect(identity.title).toBe(DEFAULT_TITLE);
  expect(identity.axes).toEqual([]);
  expect(identity.strengths).toEqual([]);
  expect(identity.weaknesses).toHaveLength(5);
});

test("one active axis gives its own single-axis title", () => {
  let bundle = { hotelState: hotel() };
  bundle = invest(bundle, "eco-breakfast", { day: 1 });
  const identity = hotelIdentity(bundle.hotelState);
  expect(identity.title).toBe("Auberge Écoresponsable");
  expect(identity.strengths).toEqual(["🌱 Éco / Durabilité"]);
  expect(identity.weaknesses).toHaveLength(4);
});

test("combining Éco + Boutique gives the named 'Éco-Boutique Hôtel' title", () => {
  let bundle = { hotelState: hotel() };
  bundle = invest(bundle, "eco-breakfast", { day: 1 });
  bundle = invest(bundle, "boutique-decor", { day: 1 });
  expect(hotelIdentity(bundle.hotelState).title).toBe("Éco-Boutique Hôtel");
});

test("combining Gastronomie + Boutique gives the named 'Maison Gastronomique de Charme' title", () => {
  let bundle = { hotelState: hotel() };
  bundle = invest(bundle, "gastronomy-breakfast", { day: 1 });
  bundle = invest(bundle, "boutique-decor", { day: 1 });
  expect(hotelIdentity(bundle.hotelState).title).toBe("Maison Gastronomique de Charme");
});

test("an unnamed combination falls back to joining both axis labels", () => {
  let bundle = { hotelState: hotel() };
  bundle = invest(bundle, "family-equipment", { day: 1 });
  bundle = invest(bundle, "eco-breakfast", { day: 1 });
  expect(hotelIdentity(bundle.hotelState).title).toBe("Auberge Familiale Écoresponsable");
});

test("lists the target segments most attracted first, and carries the real reputation bonus", () => {
  let bundle = { hotelState: hotel() };
  bundle = invest(bundle, "eco-breakfast", { day: 1 }); // hikers-eco, couples-leisure
  bundle = invest(bundle, "boutique-decor", { day: 1 }); // couples-leisure
  const identity = hotelIdentity(bundle.hotelState);
  expect(identity.targetSegments[0].id).toBe("couples-leisure");
  expect(identity.reputationBonus).toBe(5);
});
