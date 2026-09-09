import { findPathIso, avoidCollisions } from "./IsoPathfinding";

test("findPathIso returns just the start when start equals end", () => {
  const start = { col: 2, row: 2 };
  expect(findPathIso(start, { col: 2, row: 2 }, { width: 5, height: 5 })).toEqual([start]);
});

test("findPathIso finds the shortest path on an open grid", () => {
  const path = findPathIso({ col: 0, row: 0 }, { col: 2, row: 0 }, { width: 5, height: 5 });
  expect(path).toEqual([{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }]);
});

test("findPathIso routes around a blocked cell", () => {
  const blocked = new Set(["1,0"]);
  const path = findPathIso({ col: 0, row: 0 }, { col: 2, row: 0 }, { width: 5, height: 5, blocked });
  expect(path[0]).toEqual({ col: 0, row: 0 });
  expect(path[path.length - 1]).toEqual({ col: 2, row: 0 });
  expect(path).not.toContainEqual({ col: 1, row: 0 });
});

test("findPathIso returns just the start when the destination is unreachable", () => {
  // Box the start cell in on every side.
  const blocked = new Set(["1,0", "-1,0", "0,1", "0,-1"]);
  const path = findPathIso({ col: 0, row: 0 }, { col: 3, row: 3 }, { width: 5, height: 5, blocked });
  expect(path).toEqual([{ col: 0, row: 0 }]);
});

test("findPathIso returns just the start when the destination itself is blocked", () => {
  const blocked = new Set(["2,2"]);
  const path = findPathIso({ col: 0, row: 0 }, { col: 2, row: 2 }, { width: 5, height: 5, blocked });
  expect(path).toEqual([{ col: 0, row: 0 }]);
});

test("avoidCollisions leaves characters alone when no two share a cell", () => {
  const characters = [{ id: "a", col: 0, row: 0 }, { id: "b", col: 1, row: 1 }];
  expect(avoidCollisions(characters)).toEqual(characters);
});

test("avoidCollisions nudges characters sharing a cell apart, without mutating the input", () => {
  const characters = [{ id: "a", col: 3, row: 3 }, { id: "b", col: 3, row: 3 }];
  const result = avoidCollisions(characters);

  expect(characters).toEqual([{ id: "a", col: 3, row: 3 }, { id: "b", col: 3, row: 3 }]);
  expect(result[0].col).not.toBe(result[1].col);
  expect(result[0].row).toBe(3);
  expect(result[1].row).toBe(3);
});
