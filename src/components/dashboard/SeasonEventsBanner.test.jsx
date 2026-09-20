import { render, screen } from "@testing-library/react";
import SeasonEventsBanner from "./SeasonEventsBanner";
import { describeCalendar, eventsOn } from "../../lib/hotelEvents/hotelEventsEngine";

const D = (text) => new Date(`${text}T12:00:00Z`);
const DAY = 86400000;
function findDate(test, from = "2026-01-01") {
  for (let i = 0; i < 1500; i += 1) {
    const date = new Date(D(from).getTime() + i * DAY);
    if (test(date)) return date;
  }
  throw new Error("no date found");
}
const firstDay = (id) => findDate((date) => eventsOn(date).some((event) => event.id === id && event.dayNumber === 1));

describe("SeasonEventsBanner / season", () => {
  it("shows nothing without a calendar", () => {
    const { container } = render(<SeasonEventsBanner calendar={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names a high season with its demand", () => {
    render(<SeasonEventsBanner calendar={describeCalendar(D("2026-07-15"))} />);
    const badge = screen.getByTestId("season-badge");
    expect(badge).toHaveAttribute("data-tier", "high");
    expect(badge).toHaveTextContent(/haute saison/i);
    expect(badge).toHaveTextContent("+40 %");
  });

  it("names a low season with its drop", () => {
    render(<SeasonEventsBanner calendar={describeCalendar(D("2026-11-11"))} />);
    expect(screen.getByTestId("season-badge")).toHaveAttribute("data-tier", "low");
    expect(screen.getByTestId("season-badge")).toHaveTextContent("−30 %");
  });

  it("a neutral season does not claim a demand change", () => {
    render(<SeasonEventsBanner calendar={describeCalendar(D("2026-04-15"))} />);
    expect(screen.getByTestId("season-badge")).toHaveAttribute("data-tier", "shoulder");
    expect(screen.getByTestId("season-badge")).not.toHaveTextContent("%");
  });

  it("the badge explains the effects on hover", () => {
    render(<SeasonEventsBanner calendar={describeCalendar(D("2026-07-15"))} />);
    expect(screen.getByTestId("season-badge")).toHaveAttribute("title", expect.stringMatching(/demande \+40 %/i));
  });

  it("is labelled for assistive technology", () => {
    render(<SeasonEventsBanner calendar={describeCalendar(D("2026-07-15"))} />);
    expect(screen.getByLabelText(/saison et événements/i)).toBeInTheDocument();
  });
});

describe("SeasonEventsBanner / events", () => {
  it("shows an event in progress with its day count", () => {
    render(<SeasonEventsBanner calendar={describeCalendar(firstDay("festival"))} />);
    const chip = screen.getByTestId("event-ongoing-festival");
    expect(chip).toHaveTextContent(/festival local/i);
    expect(chip).toHaveTextContent("jour 1/3");
    expect(chip).toHaveAttribute("title", expect.stringMatching(/demande \+30 %/i));
  });

  it("says when it is the last day", () => {
    render(<SeasonEventsBanner calendar={describeCalendar(new Date(firstDay("festival").getTime() + 2 * DAY))} />);
    expect(screen.getByTestId("event-ongoing-festival")).toHaveTextContent(/dernier jour/i);
  });

  it("announces an event to come, with the days to wait", () => {
    render(<SeasonEventsBanner calendar={describeCalendar(new Date(firstDay("festival").getTime() - 2 * DAY))} />);
    expect(screen.getByTestId("event-upcoming-festival")).toHaveTextContent(/dans 2 j/);
  });

  it("shows several at once", () => {
    const date = findDate((d) => eventsOn(d).length >= 2);
    render(<SeasonEventsBanner calendar={describeCalendar(date)} />);
    expect(screen.getAllByTestId(/^event-ongoing-/).length).toBeGreaterThanOrEqual(2);
  });

  it("a quiet day shows the season alone", () => {
    const date = findDate((d) => eventsOn(d).length === 0 && describeCalendar(d).upcoming.length === 0);
    render(<SeasonEventsBanner calendar={describeCalendar(date)} />);
    expect(screen.queryAllByTestId(/^event-/)).toHaveLength(0);
    expect(screen.getByTestId("season-badge")).toBeInTheDocument();
  });
});
