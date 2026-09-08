import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import PMS from './pages/PMS';

jest.mock('./lib/calculs/rm', () => ({
  getRooms: jest.fn(async () => [
    { id: 1, number: '101', type: 'standard' },
    { id: 2, number: '102', type: 'deluxe' },
    { id: 3, number: '201', type: 'seminar' },
    { id: 4, number: '202', type: 'conference' },
  ]),
  getReservations: jest.fn(async () => [
    {
      id: 1,
      room_id: 1,
      room_type: 'standard',
      status: 'confirmée',
      client_name: 'Alice Martin',
      arrival: '2026-09-06',
      departure: '2026-09-09',
      price: 160,
      notes: 'Late check-in',
    },
  ]),
  occupationRate: jest.fn(() => 78),
  adr: jest.fn(() => 150),
  revpar: jest.fn(() => 117),
  integratedHotelReputation: jest.fn(() => 72),
  getRMStats: jest.fn(async () => ({
    occupancy: 78,
    adr: 150,
    revpar: 117,
    revenue: 12000,
    forecastAdvanced: { next30: 13000 },
    pickup: {},
    segmentation: { corporate: 1, leisure: 2, ota: 0, groups: 0 },
    revenueByRoomType: { standard: 9000 },
    heatmap: {},
  })),
}));

// The vertical Sidebar.jsx (with its "Restaurant Simulator" link) was
// replaced by the horizontal TopBar.jsx (see layout/Layout.jsx and
// components/navigation/TopBar.jsx) -- the Restaurant module is now
// reached through the top-bar's "Restaurant" dropdown instead.
test('renders the Restaurant dropdown in the top-bar navigation', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /restaurant/i })).toBeInTheDocument();
});

test('renders PMS housekeeping and reservation editor controls', async () => {
  render(<PMS />);

  await waitFor(() => expect(screen.getByText(/Reservation editor/i)).toBeInTheDocument());
  expect(screen.getByText(/Housekeeping workflow/i)).toBeInTheDocument();
  expect(screen.getByText(/Seminar & conference/i)).toBeInTheDocument();
});
