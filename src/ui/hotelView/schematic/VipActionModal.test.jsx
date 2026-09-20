import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VipActionModal from "./VipActionModal";
import { applyVipAction, describeVipGuests } from "../../../lib/clients/vipServiceEngine";
import { isVip, mixedRandom, UNLUCKY_STAY_CHANCE } from "../../../lib/clients/guestProfiles";
import { createEmployee } from "../../../lib/staff/staffRoster";

const DATE = new Date("2026-09-11T12:00:00Z");
const stay = (id) => ({ id, room_id: 1, room: "101", room_type: "standard", client_name: `Client ${id}`, arrival: "2026-09-10", departure: "2026-09-13", status: "confirmée", segment: "leisure", price: 120 });
const rooms = [
  { id: 1, number: "101", type: "standard", status: "occupée" },
  { id: 2, number: "301", type: "suite", status: "libre" },
];
const VIP = Array.from({ length: 6000 }, (_, i) => i + 1).find((id) => isVip(stay(id), rooms[0]) && mixedRandom(`unlucky:${id}`) >= UNLUCKY_STAY_CHANCE);
const rich = (extra = {}) => ({ finance: { revenue: [10000], costs: [0] }, ...extra });
const compact = (text) => text.replace(/\s| | /g, "");

function renderModal(hotelState = rich(), props = {}) {
  return render(
    <MemoryRouter>
      <VipActionModal reservationId={VIP} hotelState={hotelState} reservations={[stay(VIP)]} rooms={rooms} date={DATE} onAct={jest.fn()} onClose={jest.fn()} {...props} />
    </MemoryRouter>
  );
}
const stayed = (bonuses) => rich({ vipService: { stays: { [VIP]: bonuses } } });

describe("VipActionModal / the guest", () => {
  it("shows the profile, room, audience and departure", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: /accueil v\.i\.p\./i })).toBeInTheDocument();
    const profile = screen.getByTestId("vip-profile");
    expect(profile).toHaveTextContent(`Client ${VIP}`);
    expect(profile).toHaveTextContent(/influenceur \/ v\.i\.p\./i);
    expect(profile).toHaveTextContent("Chambre 101");
    expect(profile).toHaveTextContent(/abonnés/);
    expect(profile).toHaveTextContent("13");
  });

  it("says so when the guest has left", () => {
    render(
      <MemoryRouter>
        <VipActionModal reservationId={VIP} hotelState={rich()} reservations={[]} rooms={rooms} date={DATE} onClose={jest.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByTestId("vip-gone")).toHaveTextContent(/n'est plus dans l'hôtel/i);
    expect(screen.queryByTestId("vip-gauge")).not.toBeInTheDocument();
  });
});

describe("VipActionModal / the satisfaction gauge", () => {
  const [guest] = describeVipGuests({ hotelState: rich(), reservations: [stay(VIP)], rooms, date: DATE });

  it("is a meter carrying the current satisfaction, with the 85 target marked", () => {
    renderModal();
    const meter = screen.getByRole("meter", { name: /satisfaction du v\.i\.p\./i });
    expect(meter).toHaveAttribute("aria-valuenow", String(guest.satisfaction));
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByTestId("vip-gauge-bar")).toHaveStyle({ width: `${guest.satisfaction}%` });
    expect(screen.getByTestId("vip-gauge-target")).toHaveStyle({ left: "85%" });
    expect(screen.getByTestId("vip-score")).toHaveTextContent(`${guest.satisfaction}/100`);
    expect(screen.getByTestId("vip-score")).toHaveTextContent("objectif 85");
  });

  it("explains what is missing while the target is not reached", () => {
    renderModal(rich({ maintenance: { level: "economy", condition: 10 } }));
    const outcome = screen.getByTestId("vip-outcome");
    expect(outcome).toHaveAttribute("data-reached", "false");
    expect(outcome).toHaveTextContent(/il manque \d+ points/i);
  });

  it("lists what weighs on the satisfaction and what lifts it", () => {
    renderModal(stayed({ gift: { bonus: 20 } }));
    expect(screen.getByTestId("vip-line-gift")).toHaveTextContent("Cadeau de bienvenue +20");
    const run = renderModal(rich({ maintenance: { level: "economy", condition: 10 } }));
    expect(within(run.container).getAllByTestId("vip-line-upkeep")[0]).toHaveTextContent("−15");
  });

  it("announces the glowing review once the attentions took the guest to the target", () => {
    renderModal(stayed({ upgrade: { bonus: 40 }, gift: { bonus: 28 } }));
    const outcome = screen.getByTestId("vip-outcome");
    expect(outcome).toHaveAttribute("data-reached", "true");
    expect(outcome).toHaveTextContent(/avis élogieux attendu.*\+3 à \+5 points.*à la une/i);
  });

  it("without any attention, a flawless stay is five stars and nothing more", () => {
    const flawless = Array.from({ length: 6000 }, (_, i) => i + 1).find((id) => isVip(stay(id), rooms[0]) && describeVipGuests({ hotelState: rich({ maintenance: { level: "premium", condition: 95 } }), reservations: [stay(id)], rooms, date: DATE })[0].reached);
    render(
      <MemoryRouter>
        <VipActionModal reservationId={flawless} hotelState={rich({ maintenance: { level: "premium", condition: 95 } })} reservations={[stay(flawless)]} rooms={rooms} date={DATE} onClose={jest.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByTestId("vip-outcome")).toHaveTextContent(/séjour parfait/i);
  });
});

describe("VipActionModal / the attentions", () => {
  it("lists the upgrade, the three gifts and the personal service, each with its cost and bonus", () => {
    renderModal();
    ["upgrade", "gift:flowers", "gift:champagne", "gift:basket", "personal"].forEach((id) => expect(screen.getByTestId(`vip-option-${id}`)).toBeInTheDocument());
    expect(screen.getByTestId("vip-option-upgrade")).toHaveTextContent("Gratuit");
    expect(screen.getByTestId("vip-option-upgrade")).toHaveTextContent("+20 à +40");
    expect(compact(screen.getByTestId("vip-option-gift:flowers").textContent)).toContain("50€");
    expect(compact(screen.getByTestId("vip-option-gift:champagne").textContent)).toContain("100€");
    expect(compact(screen.getByTestId("vip-option-gift:basket").textContent)).toContain("150€");
  });

  it("giving an attention calls onAct with it", () => {
    const onAct = jest.fn();
    renderModal(rich(), { onAct });
    fireEvent.click(screen.getByTestId("vip-give-upgrade"));
    expect(onAct).toHaveBeenLastCalledWith({ type: "upgrade" });
    fireEvent.click(screen.getByTestId("vip-give-gift:champagne"));
    expect(onAct).toHaveBeenLastCalledWith({ type: "gift", giftId: "champagne" });
  });

  it("can't be given twice by a double click", () => {
    const onAct = jest.fn();
    renderModal(rich(), { onAct });
    const button = screen.getByTestId("vip-give-gift:flowers");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onAct).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });

  it("the upgrade is disabled, with the reason, when no suite is free", () => {
    render(
      <MemoryRouter>
        <VipActionModal reservationId={VIP} hotelState={rich()} reservations={[stay(VIP)]} rooms={[rooms[0]]} date={DATE} onClose={jest.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByTestId("vip-give-upgrade")).toBeDisabled();
    expect(screen.getByTestId("vip-option-upgrade")).toHaveTextContent(/aucune suite libre/i);
  });

  it("a gift the treasury can't pay for is disabled, the cheaper ones stay available", () => {
    renderModal(rich({ finance: { revenue: [80], costs: [0] } }));
    expect(screen.getByTestId("vip-give-gift:flowers")).toBeEnabled();
    expect(screen.getByTestId("vip-give-gift:basket")).toBeDisabled();
    expect(screen.getByTestId("vip-option-gift:basket")).toHaveTextContent(/trésorerie insuffisante/i);
  });

  it("the personal service needs staff, and names who will look after the guest", () => {
    renderModal();
    expect(screen.getByTestId("vip-give-personal")).toBeDisabled();
    expect(screen.getByTestId("vip-option-personal")).toHaveTextContent(/aucun gouvernant ou réceptionniste expérimenté/i);
    const staffed = renderModal(rich({ staffRoster: [createEmployee({ id: "e1", name: "Lina", role: "housekeeping", level: "experienced" })] }));
    expect(within(staffed.container).getAllByTestId("vip-option-personal").pop()).toHaveTextContent(/Lina/);
  });

  it("what was already given is marked done and can't be given again", () => {
    renderModal(stayed({ gift: { id: "flowers", bonus: 12, cost: 50 } }));
    ["gift:flowers", "gift:champagne", "gift:basket"].forEach((id) => {
      expect(screen.getByTestId(`vip-option-${id}`)).toHaveAttribute("data-done", "true");
      expect(screen.getByTestId(`vip-give-${id}`)).toBeDisabled();
    });
    expect(screen.getByTestId("vip-option-gift:flowers")).toHaveTextContent(/✅ un cadeau a déjà été offert/i);
  });

  it("follows the hotel: after the attentions are given the same modal shows the higher satisfaction", () => {
    const start = { hotelState: rich(), reservations: [stay(VIP)], rooms };
    const { rerender } = renderModal(start.hotelState);
    const before = Number(screen.getByTestId("vip-gauge").getAttribute("aria-valuenow"));
    const next = applyVipAction(start, VIP, { type: "upgrade" }, { day: 4, date: DATE });
    rerender(
      <MemoryRouter>
        <VipActionModal reservationId={VIP} hotelState={next.hotelState} reservations={next.reservations} rooms={next.rooms} date={DATE} onClose={jest.fn()} />
      </MemoryRouter>
    );
    expect(Number(screen.getByTestId("vip-gauge").getAttribute("aria-valuenow"))).toBeGreaterThan(before);
    expect(screen.getByTestId("vip-option-upgrade")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("vip-profile")).toHaveTextContent("Chambre 301");
  });

  it("links to the room's page", () => {
    renderModal();
    expect(screen.getByRole("link", { name: /fiche de la chambre/i })).toHaveAttribute("href", "/rooms");
  });

  it("closes through its close button", () => {
    const onClose = jest.fn();
    renderModal(rich(), { onClose });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
