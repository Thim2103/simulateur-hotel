import { render, screen, fireEvent } from "@testing-library/react";
import DailyReportModal from "./DailyReportModal";

function sampleReport(overrides = {}) {
  return {
    date: "2026-09-10",
    hotelRevenue: { netRevenue: 500, occupiedRooms: 3, otaCommission: 20 },
    restaurantRevenue: { netRevenue: 200, margin: 80, vat: 40 },
    expenses: { total: 300, fixed: 200, variable: 100 },
    profit: 400,
    events: [{ id: "vip_guest", severity: "low", message: "Un client VIP séjourne à l'hôtel." }],
    staffChanges: { headcount: 5, moraleChanges: [{ id: 1, name: "Ada", from: 70, to: 65 }], departures: [] },
    reservationsChanges: { checkIns: [{ id: 1 }], checkOuts: [], noShows: [{ id: 2 }] },
    ...overrides,
  };
}

test("renders nothing when there is no report", () => {
  const { container } = render(<DailyReportModal report={null} onClose={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});

test("displays the date, revenue, expenses and profit", () => {
  render(<DailyReportModal report={sampleReport()} onClose={() => {}} />);

  expect(screen.getByText("2026-09-10")).toBeInTheDocument();
  expect(screen.getByText("500 €")).toBeInTheDocument();
  expect(screen.getByText("200 €")).toBeInTheDocument();
  expect(screen.getByText("300 €")).toBeInTheDocument();
  expect(screen.getByText("+400 €")).toBeInTheDocument();
});

test("lists today's events", () => {
  render(<DailyReportModal report={sampleReport()} onClose={() => {}} />);
  expect(screen.getByText(/client VIP séjourne/i)).toBeInTheDocument();
});

test("shows the event's category and financial impact", () => {
  render(
    <DailyReportModal
      report={sampleReport({
        events: [
          { id: "vip_guest", category: "guest", severity: "low", message: "Un client VIP séjourne à l'hôtel.", impact: { revenue: 200, reputation: 2 } },
        ],
      })}
      onClose={() => {}}
    />
  );

  expect(screen.getByText("Client")).toBeInTheDocument();
  expect(screen.getByText(/\+200 € CA/)).toBeInTheDocument();
  expect(screen.getByText(/\+2 pts réputation/)).toBeInTheDocument();
});

test("shows the day progress for a still-ongoing multi-day event", () => {
  render(
    <DailyReportModal
      report={sampleReport({
        events: [{ id: "weather", category: "environment", severity: "medium", message: "Météo du jour : canicule.", totalDays: 3, remainingDays: 2 }],
      })}
      onClose={() => {}}
    />
  );

  expect(screen.getByText("jour 2/3")).toBeInTheDocument();
});

test("shows a fallback message when there are no events", () => {
  render(<DailyReportModal report={sampleReport({ events: [] })} onClose={() => {}} />);
  expect(screen.getByText(/aucun événement notable/i)).toBeInTheDocument();
});

test("shows staff and reservation change counts", () => {
  render(<DailyReportModal report={sampleReport()} onClose={() => {}} />);
  expect(screen.getByText("5")).toBeInTheDocument(); // headcount
  // moraleChanges (1), checkIns (1), and noShows (1) each render a "1" tile.
  expect(screen.getAllByText("1")).toHaveLength(3);
});

test("calls onClose when the (X) close button is clicked", () => {
  const onClose = jest.fn();
  render(<DailyReportModal report={sampleReport()} onClose={onClose} />);

  fireEvent.click(screen.getByRole("button", { name: "Fermer le rapport" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("calls onClose when the footer Fermer button is clicked", () => {
  const onClose = jest.fn();
  render(<DailyReportModal report={sampleReport()} onClose={onClose} />);

  fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("calls onClose when clicking the backdrop but not the dialog content", () => {
  const onClose = jest.fn();
  render(<DailyReportModal report={sampleReport()} onClose={onClose} />);

  fireEvent.click(screen.getByRole("dialog"));
  expect(onClose).toHaveBeenCalledTimes(1);

  onClose.mockClear();
  fireEvent.click(screen.getByText("2026-09-10"));
  expect(onClose).not.toHaveBeenCalled();
});
