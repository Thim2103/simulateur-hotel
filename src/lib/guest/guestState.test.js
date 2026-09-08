import { clearGuestState, listGuestStateNamespaces, loadGuestState, saveGuestState } from "./guestState";

beforeEach(() => {
  window.localStorage.clear();
});

test("saveGuestState/loadGuestState round-trip a namespace's state", () => {
  saveGuestState("career", { day: 3 });
  expect(loadGuestState("career")).toEqual({ day: 3 });
});

test("namespaces are isolated from each other", () => {
  saveGuestState("career", { day: 3 });
  saveGuestState("restaurant", { structure: { name: "Le Central" } });
  expect(loadGuestState("career")).toEqual({ day: 3 });
  expect(loadGuestState("restaurant")).toEqual({ structure: { name: "Le Central" } });
});

test("loadGuestState returns the fallback for an untouched namespace", () => {
  expect(loadGuestState("pms", [])).toEqual([]);
});

test("clearGuestState resets a namespace back to null (or an explicit default)", () => {
  saveGuestState("career", { day: 3 });
  clearGuestState("career");
  expect(loadGuestState("career")).toBeNull();
});

test("listGuestStateNamespaces reports every namespace currently saved", () => {
  saveGuestState("career", {});
  saveGuestState("restaurant", {});
  expect(listGuestStateNamespaces().sort()).toEqual(["career", "restaurant"]);
});
