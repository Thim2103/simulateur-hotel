import { DIRECT_ACTION_MODALS, getDirectActionModal } from "./directActions";

describe("directActions / getDirectActionModal", () => {
  it("returns null when nothing is registered for the entity's type", () => {
    expect(getDirectActionModal({ type: "room" })).toBeNull();
    expect(getDirectActionModal({ type: "laundry" })).toBeNull();
  });

  it("returns the registered component for a type present in the given registry", () => {
    function FakeModal() {
      return null;
    }
    const registry = { room: FakeModal };
    expect(getDirectActionModal({ type: "room" }, registry)).toBe(FakeModal);
  });

  it("defaults to the shared DIRECT_ACTION_MODALS registry when none is given", () => {
    expect(getDirectActionModal({ type: "room" })).toBe(DIRECT_ACTION_MODALS.room ?? null);
  });
});
