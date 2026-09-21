import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EventCalendarWidget from "./EventCalendarWidget";
import { eventsOn, eventsBetween } from "../../lib/hotelEvents/hotelEventsEngine";
import { eventCalendar, SHORT_HORIZON } from "../../lib/seasonEvents/seasonEventEngine";
import { setYieldEnabled, setYieldRule } from "../../lib/rm/yieldManagementEngine";

const DAY = 86400000;
const D = (text) => new Date(`${text}T12:00:00Z`);
const plus = (date, days) => new Date(date.getTime() + days * DAY);

function findDate(predicate, from = D("2026-01-01"), span = 900) {
  for (let i = 0; i < span; i += 1) {
    const date = plus(from, i);
    if (predicate(date)) return date;
  }
  throw new Error("no such date");
}
const firstDayOf = (id) => findDate((date) => eventsOn(date).some((event) => event.id === id && event.dayNumber === 1));

const view = (date, props = {}) =>
  render(
    <MemoryRouter>
      <EventCalendarWidget hotelState={{}} date={date} onOpenGrowth={jest.fn()} {...props} />
    </MemoryRouter>
  );

describe("EventCalendarWidget", () => {
  const festival = firstDayOf("music-festival");

  it("is a Bento card with its title", () => {
    view(festival);
    expect(screen.getByTestId("event-calendar")).toHaveClass("bento-card");
    expect(screen.getByRole("heading", { level: 2, name: "Calendrier des événements" })).toBeInTheDocument();
  });

  it("names the season, the calendar's tier and its effect on demand", () => {
    view(D("2026-07-15"));
    const season = screen.getByTestId("event-calendar-season");
    expect(season).toHaveAttribute("data-season", "summer");
    expect(season).toHaveTextContent("Été");
    expect(season).toHaveTextContent(/haute saison/i);
    expect(season).toHaveTextContent("Demande +40 %");
    expect(season).toHaveTextContent(/moins sensibles aux prix/i);
    expect(screen.getByTestId("event-calendar-advice")).toHaveTextContent(/relevez vos tarifs/i);
  });

  it("spring and autumn show the professional share; the low season warns about yield", () => {
    const { unmount } = view(D("2026-10-14"));
    expect(screen.getByTestId("event-calendar-pro")).toHaveTextContent("Clientèle Pro 50 %");
    unmount();
    view(D("2026-11-11"));
    expect(screen.queryByTestId("event-calendar-pro")).not.toBeInTheDocument();
    expect(screen.getByTestId("event-calendar-advice")).toHaveTextContent(/yield management/i);
    expect(screen.getByTestId("event-calendar-season")).toHaveTextContent("Demande −30 %");
  });

  it("lists, by default, the events of the next 7 days", () => {
    view(plus(festival, -4));
    expect(screen.getByRole("button", { name: "7 jours" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "30 jours" })).toHaveAttribute("aria-pressed", "false");
    const item = screen.getByTestId("calendar-event-music-festival");
    expect(item).toHaveTextContent("Grand Festival de Musique");
    expect(screen.getByTestId("calendar-when-music-festival")).toHaveTextContent("dans 4 jours");
    expect(item).toHaveTextContent("3 jours");
  });

  it("shows what the event does: demand, prices, high-end guests", () => {
    view(plus(festival, -4));
    const item = within(screen.getByTestId("calendar-event-music-festival"));
    expect(item.getByText("Demande +80 %")).toBeInTheDocument();
    expect(item.getByText("Tarifs jusqu'à +25 %")).toBeInTheDocument();
    expect(item.getByText("Haut de gamme")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-event-music-festival")).toHaveAttribute("data-kind", "demand");
  });

  it("the 30-day view shows events a week view hides", () => {
    const far = plus(festival, -20);
    view(far);
    expect(screen.queryByTestId("calendar-event-music-festival")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "30 jours" }));
    expect(screen.getByTestId("calendar-event-music-festival")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 jours" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "7 jours" }));
    expect(screen.queryByTestId("calendar-event-music-festival")).not.toBeInTheDocument();
  });

  it("an event in progress says which day it is", () => {
    view(plus(festival, 1));
    expect(screen.getByTestId("calendar-when-music-festival")).toHaveTextContent("en cours, jour 2/3");
    expect(screen.getByTestId("calendar-event-music-festival")).toHaveAttribute("data-ongoing", "true");
  });

  it("and its last day", () => {
    view(plus(festival, 2));
    expect(screen.getByTestId("calendar-when-music-festival")).toHaveTextContent("dernier jour");
  });

  it("roadworks are shown as a nuisance, with the satisfaction they cost and no price advice", () => {
    const works = firstDayOf("roadworks");
    view(plus(works, -2));
    const item = screen.getByTestId("calendar-event-roadworks");
    expect(item).toHaveAttribute("data-kind", "nuisance");
    expect(item).toHaveTextContent("Satisfaction −5 pts");
    expect(item).toHaveTextContent(/5 jours/);
    expect(screen.queryByTestId("calendar-prepare-roadworks")).not.toBeInTheDocument();
  });

  it("an opportunity offers to prepare the prices, which opens the yield desk", () => {
    const onOpenGrowth = jest.fn();
    view(plus(festival, -4), { onOpenGrowth });
    fireEvent.click(screen.getByTestId("calendar-prepare-music-festival"));
    expect(onOpenGrowth).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /préparer le restaurant/i })).toHaveAttribute("href", "/restaurant/menu");
  });

  it("says whether the event pricing rule is on", () => {
    const date = plus(festival, -4);
    const { unmount } = view(date);
    expect(screen.getByTestId("calendar-yield-music-festival")).toHaveTextContent("Tarifs événements à activer");
    unmount();
    const on = setYieldRule(setYieldEnabled({ hotelState: {} }, true), "events", { enabled: true }).hotelState;
    view(date, { hotelState: on });
    expect(screen.getByTestId("calendar-yield-music-festival")).toHaveTextContent("Tarifs événements activés");
  });

  it("with the rule on but yield management off, it is still to be activated", () => {
    const off = setYieldRule({ hotelState: {} }, "events", { enabled: true }).hotelState;
    view(plus(festival, -4), { hotelState: off });
    expect(screen.getByTestId("calendar-yield-music-festival")).toHaveTextContent("Tarifs événements à activer");
  });

  it("says so when nothing is announced", () => {
    const quiet = findDate((day) => eventCalendar(day, {}, SHORT_HORIZON).length === 0);
    view(quiet);
    expect(screen.getByTestId("event-calendar-empty")).toHaveTextContent("Aucun événement annoncé dans les 7 prochains jours");
    expect(screen.queryByTestId("event-calendar-list")).not.toBeInTheDocument();
  });

  it("lists the same events as the engine, in the same order", () => {
    const date = plus(festival, -25);
    view(date);
    fireEvent.click(screen.getByRole("button", { name: "30 jours" }));
    const shown = within(screen.getByTestId("event-calendar-list")).getAllByRole("listitem").map((item) => item.getAttribute("data-testid").replace("calendar-event-", ""));
    expect(shown).toEqual(eventCalendar(date, {}, 30).map((event) => event.id));
    expect(eventsBetween(date, 30).length).toBeGreaterThanOrEqual(shown.length);
  });
});
