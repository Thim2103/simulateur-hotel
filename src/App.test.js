import { render, screen } from '@testing-library/react';
import App from './App';

test('renders restaurant simulator entry in navigation', () => {
  render(<App />);
  expect(screen.getByText(/restaurant simulator/i)).toBeInTheDocument();
});
