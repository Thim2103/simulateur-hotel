import { render, screen, fireEvent, within } from "@testing-library/react";
import ZoneUpgradeModal from "./ZoneUpgradeModal";
import { UPGRADES } from "../../../lib/zones/zoneUpgradesEngine";

const hotel = (extra = {}) => ({ expansion: { availableCapital: 100000 }, ...extra });
const installed = (...ids) => ({ zoneUpgrades: { installed: Object.fromEntries(ids.map((id) => [id, { day: 1 }])), works: {}, completedLog: [] } });
const underWorks = (id, completesOnDay = 9) => ({ zoneUpgrades: { installed: {}, works: { [id]: { startedOnDay: 1, completesOnDay } }, completedLog: [] } });

const renderModal = (props) => render(<ZoneUpgradeModal zoneId="rooms" hotelState={hotel()} day={4} onStart={jest.fn()} onClose={jest.fn()} {...props} />);
const row = (id) => screen.getByTestId(`upgrade-${id}`);

describe("ZoneUpgradeModal / presentation", () => {
  it("names the zone, shows its level as stars and the capital available", () => {
    renderModal({ hotelState: hotel(installed("rooms-bedding")) });
    expect(screen.getByRole("dialog", { name: /chambres/i })).toBeInTheDocument();
    expect(screen.getByTestId("zone-level")).toHaveAttribute("aria-label", "Niveau 1 sur 3");
    expect(screen.getByTestId("zone-level")).toHaveTextContent("⭐☆☆");
    expect(screen.getByTestId("zone-capital").textContent.replace(/\s| | /g, "")).toContain("100000€");
  });

  it("lists the zone's three upgrades with description, cost, duration and every benefit", () => {
    renderModal();
    ["rooms-bedding", "rooms-soundproofing", "rooms-domotics"].forEach((id) => expect(row(id)).toBeInTheDocument());
    const bedding = row("rooms-bedding");
    expect(bedding).toHaveTextContent("Literie de luxe");
    expect(bedding).toHaveTextContent(UPGRADES["rooms-bedding"].description);
    expect(bedding.textContent.replace(/\s| | /g, "")).toContain("8000€");
    expect(bedding).toHaveTextContent(`${UPGRADES["rooms-bedding"].days} j de travaux`);
    expect(bedding).toHaveTextContent(/standing \+4 %/i);
    expect(bedding).toHaveTextContent(/satisfaction des clients \+3/i);
    expect(row("rooms-soundproofing")).toHaveTextContent(/10 % de pannes en moins/i);
    expect(row("rooms-domotics")).toHaveTextContent(/énergie : −25 €\/jour/i);
  });

  it("shows another zone's upgrades when opened on it", () => {
    renderModal({ zoneId: "laundry" });
    expect(row("laundry-industrial")).toHaveTextContent(/nettoyage 20 % plus rapide/i);
    expect(screen.queryByTestId("upgrade-rooms-bedding")).not.toBeInTheDocument();
  });
});

describe("ZoneUpgradeModal / statuses", () => {
  it("an affordable upgrade is startable", () => {
    renderModal();
    expect(within(row("rooms-bedding")).getByRole("button", { name: /lancer les travaux/i })).toBeEnabled();
    expect(row("rooms-bedding")).toHaveAttribute("data-status", "available");
  });

  it("an installed upgrade says so and has no start button", () => {
    renderModal({ hotelState: hotel(installed("rooms-bedding")) });
    expect(screen.getByTestId("upgrade-rooms-bedding-status")).toHaveTextContent(/installé/i);
    expect(within(row("rooms-bedding")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("an upgrade under works shows its completion day, and a works banner shows for the zone", () => {
    renderModal({ hotelState: hotel(underWorks("rooms-bedding", 7)) });
    expect(screen.getByTestId("upgrade-rooms-bedding-status")).toHaveTextContent(/travaux en cours — terminés au jour 7/i);
    expect(screen.getByTestId("zone-works")).toHaveTextContent(/literie de luxe.*jour 7/i);
  });

  it("while a zone is under works, its other upgrades are disabled with an explanation", () => {
    renderModal({ hotelState: hotel(underWorks("rooms-bedding")) });
    expect(within(row("rooms-soundproofing")).getByRole("button", { name: /lancer les travaux/i })).toBeDisabled();
    expect(screen.getByTestId("upgrade-rooms-soundproofing-status")).toHaveTextContent(/autre amélioration.*en travaux/i);
  });

  it("an unaffordable upgrade is disabled and explains why", () => {
    renderModal({ hotelState: { expansion: { availableCapital: 500 } } });
    expect(within(row("rooms-bedding")).getByRole("button", { name: /lancer les travaux/i })).toBeDisabled();
    expect(screen.getByTestId("upgrade-rooms-bedding-status")).toHaveTextContent(/fonds insuffisants/i);
  });

  it("a locked upgrade names its prerequisite", () => {
    renderModal({ zoneId: "pool" });
    expect(screen.getByTestId("upgrade-pool-lounge-status")).toHaveTextContent(/nécessite : construction de la piscine rooftop/i);
    expect(within(row("pool-lounge")).getByRole("button", { name: /lancer les travaux/i })).toBeDisabled();
    expect(within(row("pool-build")).getByRole("button", { name: /lancer les travaux/i })).toBeEnabled();
  });

  it("the prerequisite installed unlocks the rest of the rooftop", () => {
    renderModal({ zoneId: "pool", hotelState: hotel(installed("pool-build")) });
    expect(within(row("pool-lounge")).getByRole("button", { name: /lancer les travaux/i })).toBeEnabled();
    expect(screen.getByTestId("zone-level")).toHaveTextContent("⭐☆☆");
  });
});

describe("ZoneUpgradeModal / actions", () => {
  it("starting works calls onStart with the upgrade id", () => {
    const onStart = jest.fn();
    renderModal({ onStart });
    fireEvent.click(within(row("rooms-soundproofing")).getByRole("button", { name: /lancer les travaux/i }));
    expect(onStart).toHaveBeenCalledWith("rooms-soundproofing");
  });

  it("can't be double-clicked into a second charge", () => {
    const onStart = jest.fn();
    renderModal({ onStart });
    const button = within(row("rooms-bedding")).getByRole("button", { name: /lancer les travaux/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });

  it("closes through its close button", () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
