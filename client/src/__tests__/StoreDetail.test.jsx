import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { StoreDetailPage } from '../pages/StoreDetailPage.jsx';
import { server } from '../test/mocks/server.js';
import { MOCK_CHARACTER } from '../test/mocks/handlers.js';

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, useParams: () => ({ id: '1' }) };
});

describe('StoreDetailPage', () => {
  beforeEach(() => {
    sessionStorage.setItem('dnd_character', JSON.stringify(MOCK_CHARACTER));
  });
  afterEach(() => {
    sessionStorage.clear();
  });
  it('renders store name and listings', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => expect(screen.getByText('Longsword')).toBeInTheDocument());
    expect(screen.getByText('Ye Olde Shoppe')).toBeInTheDocument();
  });

  it('shows item price', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => expect(screen.getByText('15 GP')).toBeInTheDocument());
  });

  it('shows Buy button for listings', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => expect(screen.getByText('Buy')).toBeInTheDocument());
  });

  it('shows confirm modal when Buy is clicked', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getByText('Buy'));
    await userEvent.click(screen.getByText('Buy'));
    expect(screen.getByText('Confirm Purchase')).toBeInTheDocument();
  });

  it('shows insufficient gold warning in modal when too expensive', async () => {
    server.use(http.get('/api/stores/1', () => HttpResponse.json({
      id: 1, name: 'Shop', is_open: 1, listings: [{
        id: 1, item_name: 'Dragon Egg', effective_price_cp: 1000000, quantity: 1,
      }],
    })));
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getByText('Buy'));
    await userEvent.click(screen.getByText('Buy'));
    expect(screen.getByText(/Not enough gold/i)).toBeInTheDocument();
  });

  it('shows empty state when store has no listings', async () => {
    server.use(http.get('/api/stores/1', () => HttpResponse.json({ id: 1, name: 'Empty Shop', is_open: 1, listings: [] })));
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => expect(screen.getByText(/no items/i)).toBeInTheDocument());
  });
});
