import { DIRECT_ACTION_MODALS, getDirectActionModal } from "./directActions";
import HousekeepingQuickModal from "./HousekeepingQuickModal";
import IncidentQuickModal from "./IncidentQuickModal";

describe("directActions / getDirectActionModal", () => {
  it("returns null when nothing is registered for the entity's type, in a given registry", () => {
    expect(getDirectActionModal({ type: "reception" }, {})).toBeNull();
    expect(getDirectActionModal({ type: "unknown-type" }, {})).toBeNull();
  });

  it("returns the registered component for a type present in the given registry", () => {
    function FakeModal() {
      return null;
    }
    const registry = { room: FakeModal };
    expect(getDirectActionModal({ type: "room" }, registry)).toBe(FakeModal);
  });

  it("defaults to the shared DIRECT_ACTION_MODALS registry when none is given", () => {
    expect(getDirectActionModal({ type: "room" })).toBe(DIRECT_ACTION_MODALS.room);
  });

  it("registers the real housekeeping and incident quick-action modals for rooms and the laundry amenity", () => {
    expect(DIRECT_ACTION_MODALS.room).toBe(HousekeepingQuickModal);
    expect(DIRECT_ACTION_MODALS.laundry).toBe(IncidentQuickModal);
  });

  it("has no entry for any other amenity kind (none of them can carry an alert state yet)", () => {
    ["reception", "restaurant", "kitchen", "bar", "hall"].forEach((kind) => {
      expect(DIRECT_ACTION_MODALS[kind]).toBeUndefined();
    });
  });
});
