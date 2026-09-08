import { GUEST_STORAGE_NAMESPACE, listGuestKeys, readGuestItem, removeGuestItem, writeGuestItem } from "./guestStorage";

beforeEach(() => {
  window.localStorage.clear();
});

test("writeGuestItem/readGuestItem round-trip a value through the namespaced key", () => {
  writeGuestItem("session", { user: { id: "guest-1" } });
  expect(readGuestItem("session")).toEqual({ user: { id: "guest-1" } });
  expect(window.localStorage.getItem(`${GUEST_STORAGE_NAMESPACE}:session`)).not.toBeNull();
});

test("readGuestItem returns the fallback when the key is missing", () => {
  expect(readGuestItem("missing", "fallback")).toBe("fallback");
  expect(readGuestItem("missing")).toBeNull();
});

test("readGuestItem returns the fallback instead of throwing on malformed JSON", () => {
  window.localStorage.setItem(`${GUEST_STORAGE_NAMESPACE}:broken`, "{not json");
  expect(readGuestItem("broken", "safe")).toBe("safe");
});

test("removeGuestItem clears exactly the key it was given", () => {
  writeGuestItem("a", 1);
  writeGuestItem("b", 2);
  removeGuestItem("a");
  expect(readGuestItem("a")).toBeNull();
  expect(readGuestItem("b")).toBe(2);
});

test("listGuestKeys only returns keys under this module's namespace", () => {
  writeGuestItem("a", 1);
  window.localStorage.setItem("someone-elses-key", "1");
  expect(listGuestKeys()).toEqual(["a"]);
});
