import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotificationCenter from "./NotificationCenter";
import StatusBar from "./StatusBar";
import { useOptionalCareerContext } from "../../context/CareerContext";
import { useOptionalGmDesk } from "../gmDesk/GmDeskProvider";
import { buildStatusSummary, urgentItems } from "../../lib/dashboard/statusSummary";
import { advanceMediaCrisis, respondToCrisis } from "../../lib/mediaCrisis/mediaCrisisEngine";

vi.mock("../../context/CareerContext");
vi.mock("../gmDesk/GmDeskProvider", async (importOriginal) => ({ ...(await importOriginal()), useOptionalGmDesk: jest.fn() }));

const ONSET = "2026-09-24";
const baseHotel = () => ({
  finance: { revenue: [50000], costs: [0] },
  progression: { player: { reputation: 70 } },
  hotelEvents: { today: null, audits: [{ id: `audit:${ONSET}`, day: 10, date: ONSET, score: 30, outcome: "warning", reputation: -4, untilDay: 25 }] },
  activeIncidents: [{ id: "i1", status: "active", severity: "minor" }],
});
const crisisHotel = () => advanceMediaCrisis(baseHotel(), { date: ONSET, day: 10 });
const career = (hotelState) => ({ day: 11, startDate: "2026-09-14", hotel: { rooms: [{ id: 1, number: "101", type: "standard", status: "libre" }], reservations: [], hotelState } });

describe("urgentItems / the media crisis", () => {
  it("heads the list, ahead of the breakdowns", () => {
    const items = urgentItems(career(crisisHotel()));
    expect(items.map((item) => item.id)).toEqual(["crisis", "incidents"]);
    expect(items[0]).toMatchObject({ kind: "crisis", tone: "danger", icon: "🚨", count: 1, priority: true, to: "/dashboard#crisis" });
    expect(items[0].label).toBe("Crise médiatique : Intoxication alimentaire au restaurant. Répondez !");
  });

  it("is not there without a crisis", () => {
    expect(urgentItems(career(baseHotel())).map((item) => item.id)).toEqual(["incidents"]);
  });

  it("stops shouting once answered, but stays in view until it ends", () => {
    const answered = respondToCrisis({ hotelState: crisisHotel() }, "deny", { date: "2026-09-25", day: 11 }).hotelState;
    const [item] = urgentItems(career(answered));
    expect(item).toMatchObject({ id: "crisis", tone: "vip", priority: false });
    expect(item.label).toBe("Crise médiatique en cours : Intoxication alimentaire au restaurant");
  });

  it("disappears once the audits have ended it", () => {
    const cleared = respondToCrisis({ hotelState: crisisHotel() }, "audit", { date: "2026-09-25", day: 11 }).hotelState;
    expect(urgentItems(career(cleared)).map((item) => item.id)).toEqual(["incidents"]);
  });

  it("counts on the notification total", () => {
    expect(buildStatusSummary(career(crisisHotel())).notificationCount).toBe(2);
  });
});

describe("NotificationCenter / priority", () => {
  const items = [
    { id: "crisis", tone: "danger", icon: "🚨", count: 1, priority: true, label: "Crise médiatique : x. Répondez !", to: "/dashboard#crisis" },
    { id: "gm", tone: "action", icon: "📬", count: 2, label: "2 messages au GM Desk", to: "/gm-desk" },
  ];
  const view = (list) => render(<MemoryRouter><NotificationCenter items={list} /></MemoryRouter>);

  it("beats the bell while a priority notification waits", () => {
    view(items);
    const bell = screen.getByTestId("notification-bell");
    expect(bell).toHaveAttribute("data-priority", "true");
    expect(bell).toHaveClass("crisis-blink");
  });

  it("leaves the bell calm without one", () => {
    view([items[1]]);
    const bell = screen.getByTestId("notification-bell");
    expect(bell).not.toHaveAttribute("data-priority");
    expect(bell).not.toHaveClass("crisis-blink");
  });

  it("lists the priority notification first, in red", () => {
    view(items);
    fireEvent.click(screen.getByTestId("notification-bell"));
    const panel = within(screen.getByRole("region", { name: /notifications urgentes/i }));
    expect(panel.getAllByRole("link")[0]).toBe(panel.getByTestId("notification-crisis"));
    expect(panel.getByTestId("notification-crisis")).toHaveAttribute("data-priority", "true");
    expect(panel.getByTestId("notification-crisis")).toHaveClass("border-rose-300");
    expect(panel.getByTestId("notification-gm")).not.toHaveAttribute("data-priority");
  });
});

describe("StatusBar / with a crisis", () => {
  it("rings the bell and puts the crisis at the top of the panel", () => {
    useOptionalGmDesk.mockReturnValue({ messages: [] });
    useOptionalCareerContext.mockReturnValue({ careerState: career(crisisHotel()) });
    render(<MemoryRouter><StatusBar /></MemoryRouter>);
    expect(screen.getByTestId("notification-bell")).toHaveAttribute("data-priority", "true");
    fireEvent.click(screen.getByTestId("notification-bell"));
    expect(screen.getByTestId("notification-crisis")).toHaveTextContent(/Crise médiatique/);
  });
});
