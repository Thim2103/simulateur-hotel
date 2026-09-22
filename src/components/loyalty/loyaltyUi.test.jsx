import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoyaltyPanel from "./LoyaltyPanel";
import LoyaltyProgramModal from "./LoyaltyProgramModal";
import { launchProgram, setBenefit, BENEFIT_IDS, BENEFITS, LAUNCH_COST, BASE_SATISFACTION } from "../../lib/loyalty/loyaltyProgramEngine";

const DATE = new Date("2026-09-14T12:00:00Z");
const hotel = (treasury = 50000) => ({ finance: { revenue: [treasury], costs: [0] }, progression: { player: { reputation: 70 } } });
const member = (n, stays) => ({ id: `member:${n}`, name: `Membre ${n}`, stays, joinedDay: 0, lastStayDay: 0, tier: stays >= 6 ? "platinum" : stays >= 3 ? "gold" : "silver" });
function club(list = [], perks = [], ledger = {}) {
  const launched = launchProgram({ hotelState: hotel() }, { day: 1 }).hotelState;
  return { ...launched, loyalty: { ...launched.loyalty, members: list, nextId: list.length + 1, benefits: Object.fromEntries(perks.map((id) => [id, true])), ledger: { cost: 0, savings: 0, memberBookings: 0, bookings: 0, memberNights: 0, ...ledger } } };
}
const stay = (id, memberId) => ({ id, room_id: 1, arrival: "2026-09-13", departure: "2026-09-16", status: "confirmée", price: 120, source: "direct", metadata: { loyalty: { memberId, saved: false } } });

const panel = (hotelState, props = {}) => render(<LoyaltyPanel hotelState={hotelState} reservations={[]} date={DATE} onLaunch={jest.fn()} onToggleBenefit={jest.fn()} {...props} />);

describe("LoyaltyPanel / before the launch", () => {
  it("presents the club and offers to launch it for 5 000 EUR", () => {
    panel(hotel());
    expect(screen.getByTestId("loyalty-panel")).toHaveAttribute("data-launched", "false");
    expect(screen.getByText(/sans commission d'OTA/i)).toBeInTheDocument();
    expect(screen.getByTestId("loyalty-launch")).toHaveTextContent("Lancer le club");
    expect(screen.getByTestId("loyalty-launch").textContent.replace(/\s| | /g, "")).toContain("5000€");
    expect(screen.getByTestId("loyalty-launch")).toBeEnabled();
    expect(screen.queryByTestId("loyalty-launch-reason")).not.toBeInTheDocument();
  });

  it("names the three levels and when they are reached", () => {
    panel(hotel());
    expect(screen.getByText(/Silver/)).toBeInTheDocument();
    expect(screen.getByText(/à partir de 3 séjours/)).toBeInTheDocument();
    expect(screen.getByText(/à partir de 6 séjours/)).toBeInTheDocument();
  });

  it("launching calls onLaunch", () => {
    const onLaunch = jest.fn();
    panel(hotel(), { onLaunch });
    fireEvent.click(screen.getByTestId("loyalty-launch"));
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("locks the launch when the treasury cannot pay, and says why", () => {
    panel(hotel(LAUNCH_COST - 1));
    expect(screen.getByTestId("loyalty-launch")).toBeDisabled();
    expect(screen.getByTestId("loyalty-launch-reason")).toHaveTextContent("Trésorerie insuffisante");
  });
});

describe("LoyaltyPanel / the club at work", () => {
  it("tells the launch", () => {
    panel(club());
    expect(screen.getByTestId("loyalty-panel")).toHaveAttribute("data-launched", "true");
    expect(screen.getByTestId("loyalty-outcome")).toHaveTextContent(/Club Hospitality lancé/);
    expect(screen.queryByTestId("loyalty-launch")).not.toBeInTheDocument();
  });

  it("counts the members of each level, and the total", () => {
    panel(club([member(1, 1), member(2, 2), member(3, 3), member(4, 8), member(5, 9)]));
    expect(screen.getByTestId("loyalty-count-silver")).toHaveTextContent("2");
    expect(screen.getByTestId("loyalty-count-gold")).toHaveTextContent("1");
    expect(screen.getByTestId("loyalty-count-platinum")).toHaveTextContent("2");
    expect(screen.getByTestId("loyalty-total")).toHaveTextContent("5 membres");
    expect(screen.getByTestId("loyalty-tier-gold")).toHaveAttribute("data-tone", "vip");
    expect(screen.getByTestId("loyalty-tier-platinum")).toHaveAttribute("data-tone", "mice");
  });

  it("says one member in the singular", () => {
    panel(club([member(1, 1)]));
    expect(screen.getByTestId("loyalty-total")).toHaveTextContent("1 membre");
    expect(screen.getByTestId("loyalty-total")).not.toHaveTextContent("membres");
  });

  it("shows the members' satisfaction on a gauge, and how the perks raise it", () => {
    const { unmount } = panel(club());
    expect(screen.getByRole("meter", { name: /satisfaction des membres/i })).toHaveAttribute("aria-valuenow", String(BASE_SATISFACTION));
    unmount();
    panel(club([], BENEFIT_IDS));
    expect(screen.getByRole("meter", { name: /satisfaction des membres/i })).toHaveAttribute("aria-valuenow", "91");
    expect(screen.getByTestId("loyalty-satisfaction-score")).toHaveTextContent("91/100");
  });

  it("gives the effects of the club", () => {
    panel(club(Array.from({ length: 20 }, (_, i) => member(i + 1, 4))));
    expect(screen.getByTestId("loyalty-effect-return")).toHaveTextContent(/^Retours \+\d+ %$/);
    expect(screen.getByTestId("loyalty-effect-direct")).toHaveTextContent(/^\d+ % des nouvelles réservations en direct$/);
    expect(screen.getByTestId("loyalty-effect-price")).toHaveTextContent(/^Sensibilité aux prix −\d+ %$/);
  });

  it("gives the direct-booking conversion, the commission saved and the cost of the perks", () => {
    panel(club([member(1, 1)], [], { memberBookings: 3, bookings: 12, savings: 1234.4, cost: 560, memberNights: 9 }));
    expect(screen.getByTestId("loyalty-conversion")).toHaveTextContent("25 %");
    expect(screen.getByTestId("loyalty-conversion")).toHaveTextContent("3 sur 12");
    expect(screen.getByTestId("loyalty-savings").textContent.replace(/\s| | /g, "")).toContain("1234€");
    expect(screen.getByTestId("loyalty-cost").textContent.replace(/\s| | /g, "")).toContain("560€");
  });

  it("says who is in the hotel tonight and what the perks cost for them", () => {
    const state = club([member(1, 1), member(2, 4)], ["breakfast"]);
    panel(state, { reservations: [stay(1, "member:1"), stay(2, "member:2")] });
    expect(screen.getByTestId("loyalty-tonight")).toHaveTextContent("2 membres");
    expect(screen.getByTestId("loyalty-tonight").textContent.replace(/\s| | /g, "")).toContain("24€");
  });

  it("lists the four perks with their cost, their bonus and who gets them", () => {
    panel(club());
    BENEFIT_IDS.forEach((id) => {
      const item = screen.getByTestId(`loyalty-perk-${id}`);
      expect(item).toHaveTextContent(BENEFITS[id].label);
      expect(item).toHaveTextContent(`satisfaction +${BENEFITS[id].bonus}`);
    });
    expect(screen.getByTestId("loyalty-perk-breakfast")).toHaveTextContent("Petit-déjeuner inclus");
    expect(screen.getByTestId("loyalty-perk-breakfast")).not.toHaveTextContent("Gold et Platinum");
    expect(screen.getByTestId("loyalty-perk-upgrade")).toHaveTextContent("Surclassement prioritaire");
    expect(screen.getByTestId("loyalty-perk-upgrade")).toHaveTextContent("(Gold et Platinum)");
    expect(screen.getByTestId("loyalty-perk-drink")).toHaveTextContent("Welcome Drink");
  });

  it("each perk is a switch showing its state", () => {
    panel(club([], ["drink"]));
    const on = screen.getByRole("switch", { name: "Accorder : Welcome Drink" });
    expect(on).toHaveAttribute("aria-checked", "true");
    expect(on).toHaveTextContent("Activé");
    expect(on).toHaveAttribute("data-tone", "success");
    const off = screen.getByRole("switch", { name: "Accorder : Petit-déjeuner inclus" });
    expect(off).toHaveAttribute("aria-checked", "false");
    expect(off).toHaveTextContent("Désactivé");
    expect(screen.getByTestId("loyalty-perk-drink")).toHaveAttribute("data-enabled", "true");
  });

  it("flipping a perk calls onToggleBenefit with the new state", () => {
    const onToggleBenefit = jest.fn();
    panel(club([], ["drink"]), { onToggleBenefit });
    fireEvent.click(screen.getByTestId("loyalty-toggle-breakfast"));
    expect(onToggleBenefit).toHaveBeenLastCalledWith("breakfast", true);
    fireEvent.click(screen.getByTestId("loyalty-toggle-drink"));
    expect(onToggleBenefit).toHaveBeenLastCalledWith("drink", false);
  });

  it("follows the hotel's state: a perk set through the engine shows up", () => {
    const state = setBenefit({ hotelState: club() }, "lateCheckout", true).hotelState;
    panel(state);
    expect(screen.getByTestId("loyalty-perk-lateCheckout")).toHaveAttribute("data-enabled", "true");
  });
});

describe("LoyaltyProgramModal", () => {
  const modal = (hotelState, props = {}) =>
    render(
      <MemoryRouter>
        <LoyaltyProgramModal hotelState={hotelState} reservations={[]} date={DATE} onLaunch={jest.fn()} onToggleBenefit={jest.fn()} onClose={jest.fn()} {...props} />
      </MemoryRouter>
    );

  it("opens as a dialog carrying the V.I.P. tone", () => {
    modal(hotel());
    expect(screen.getByRole("dialog", { name: /club & fidélité/i }).firstChild).toHaveAttribute("data-tone", "vip");
    expect(within(screen.getByRole("dialog")).getByTestId("loyalty-panel")).toBeInTheDocument();
  });

  it("links to the club's page", () => {
    modal(hotel());
    expect(screen.getByRole("link", { name: /ouvrir la page du club/i })).toHaveAttribute("href", "/clients/loyalty");
  });

  it("passes the actions through and closes", () => {
    const onLaunch = jest.fn();
    const onClose = jest.fn();
    modal(hotel(), { onLaunch, onClose });
    fireEvent.click(screen.getByTestId("loyalty-launch"));
    expect(onLaunch).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
