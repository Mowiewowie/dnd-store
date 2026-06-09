import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { StoreDetailPage } from '../pages/StoreDetailPage.jsx';
import { server } from '../test/mocks/server.js';
import { MOCK_CHARACTER, MOCK_INVENTORY_ITEM } from '../test/mocks/handlers.js';

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, useParams: () => ({ id: '1' }) };
});

describe('StoreDetailPage — Buy tab', () => {
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
    // Tab "Buy" + listing card "Buy" — both present
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Buy' }).length).toBeGreaterThanOrEqual(2));
  });

  it('shows confirm modal when Buy is clicked', async () => {
    renderWithProviders(<StoreDetailPage />);
    // The listing card Buy button is the last "Buy" button (tab is first)
    await waitFor(() => screen.getAllByRole('button', { name: 'Buy' }));
    const buyButtons = screen.getAllByRole('button', { name: 'Buy' });
    await userEvent.click(buyButtons[buyButtons.length - 1]);
    expect(screen.getByText('Confirm Purchase')).toBeInTheDocument();
  });

  it('shows insufficient gold warning in modal when too expensive', async () => {
    server.use(http.get('/api/stores/:id', () => HttpResponse.json({
      id: 1, name: 'Shop', is_open: 1, price_bias: 0, listings: [{
        id: 1, item_name: 'Dragon Egg', effective_price_cp: 1000000, quantity: 1,
      }],
    })));
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getAllByRole('button', { name: 'Buy' }));
    const buyButtons = screen.getAllByRole('button', { name: 'Buy' });
    await userEvent.click(buyButtons[buyButtons.length - 1]);
    expect(screen.getByText(/Not enough gold/i)).toBeInTheDocument();
  });

  it('shows empty state when store has no listings', async () => {
    server.use(http.get('/api/stores/:id', () => HttpResponse.json({ id: 1, name: 'Empty Shop', is_open: 1, price_bias: 0, listings: [] })));
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => expect(screen.getByText(/no items/i)).toBeInTheDocument());
  });

  it('cancelling the buy modal closes it', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getAllByRole('button', { name: 'Buy' }));
    const buyButtons = screen.getAllByRole('button', { name: 'Buy' });
    await userEvent.click(buyButtons[buyButtons.length - 1]);
    expect(screen.getByText('Confirm Purchase')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Confirm Purchase')).not.toBeInTheDocument();
  });
});

describe('StoreDetailPage — Sell tab', () => {
  beforeEach(() => {
    sessionStorage.setItem('dnd_character', JSON.stringify(MOCK_CHARACTER));
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders Buy and Sell tab buttons', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getByText('Ye Olde Shoppe'));
    // Sell tab button is unique; Buy appears as both tab and listing card button
    expect(screen.getAllByRole('button', { name: 'Buy' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: 'Sell' }).length).toBeGreaterThanOrEqual(1);
  });

  it('switching to Sell tab shows inventory items', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Sell' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sell' }));
    await waitFor(() => expect(screen.getByText(MOCK_INVENTORY_ITEM.item_name)).toBeInTheDocument());
  });

  it('sell tab shows buy rate percentage for the store', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Sell' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sell' }));
    // Default bias=0 → 75%
    await waitFor(() => expect(screen.getByText('75%')).toBeInTheDocument());
  });

  it('sell tab shows offer price for items with base_value_cp', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getAllByRole('button', { name: 'Sell' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Sell' })[0]);
    // base_value_cp=1000, bias=0, multiplier=0.75 → 750 cp = 7 GP 5 SP
    await waitFor(() => expect(screen.getByText(/7 GP 5 SP/i)).toBeInTheDocument());
  });

  it('shows sell confirm modal when Sell button is clicked', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Sell' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sell' }));
    await waitFor(() => screen.getByText(MOCK_INVENTORY_ITEM.item_name));
    // Find the Sell button in the listing card (not the tab button)
    const sellButtons = screen.getAllByRole('button', { name: 'Sell' });
    // The listing Sell button is the last one (tab Sell button is the first)
    await userEvent.click(sellButtons[sellButtons.length - 1]);
    expect(screen.getByText('Confirm Sale')).toBeInTheDocument();
  });

  it('cancelling sell modal closes it', async () => {
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Sell' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sell' }));
    await waitFor(() => screen.getByText(MOCK_INVENTORY_ITEM.item_name));
    const sellButtons = screen.getAllByRole('button', { name: 'Sell' });
    await userEvent.click(sellButtons[sellButtons.length - 1]);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Confirm Sale')).not.toBeInTheDocument();
  });

  it('empty inventory shows a helpful message', async () => {
    server.use(http.get('/api/characters/:id/inventory', () => HttpResponse.json([])));
    renderWithProviders(<StoreDetailPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Sell' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sell' }));
    await waitFor(() => expect(screen.getByText(/inventory is empty/i)).toBeInTheDocument());
  });
});
