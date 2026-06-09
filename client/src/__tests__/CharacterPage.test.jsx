import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { CharacterPage } from '../pages/CharacterPage.jsx';
import { server } from '../test/mocks/server.js';
import { MOCK_CHARACTER, MOCK_INVENTORY_ITEM } from '../test/mocks/handlers.js';

describe('CharacterPage', () => {
  beforeEach(() => {
    sessionStorage.setItem('dnd_character', JSON.stringify(MOCK_CHARACTER));
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders character name and class', async () => {
    renderWithProviders(<CharacterPage />);
    expect(screen.getByText('Thorin')).toBeInTheDocument();
    expect(screen.getByText('Fighter')).toBeInTheDocument();
  });

  it('shows current gold', async () => {
    renderWithProviders(<CharacterPage />);
    // GoldDisplay renders with a coin emoji prefix
    expect(screen.getByText(/50 GP/)).toBeInTheDocument();
  });

  it('shows inventory tab and inventory items on load', async () => {
    renderWithProviders(<CharacterPage />);
    await waitFor(() => expect(screen.getByText(MOCK_INVENTORY_ITEM.item_name)).toBeInTheDocument());
  });

  it('shows empty inventory message when no items', async () => {
    server.use(http.get('/api/characters/:id/inventory', () => HttpResponse.json([])));
    renderWithProviders(<CharacterPage />);
    await waitFor(() => expect(screen.getByText(/No items yet/i)).toBeInTheDocument());
  });

  it('switching to History tab shows empty state', async () => {
    renderWithProviders(<CharacterPage />);
    await waitFor(() => screen.getByRole('button', { name: 'History' }));
    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    await waitFor(() => expect(screen.getByText(/No history yet/i)).toBeInTheDocument());
  });

  it('switching to History tab shows transactions when present', async () => {
    server.use(http.get('/api/characters/:id/transactions', () => HttpResponse.json([
      { id: 1, item_name: 'Longsword', price_paid_cp: 1500, quantity: 1, type: 'purchase', notes: null, purchased_at: '2026-01-01T00:00:00.000Z' },
      { id: 2, item_name: 'Gold adjustment', price_paid_cp: 500, quantity: 1, type: 'adjustment', notes: 'Quest reward', purchased_at: '2026-01-02T00:00:00.000Z' },
    ])));
    renderWithProviders(<CharacterPage />);
    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    await waitFor(() => expect(screen.getByText('Longsword')).toBeInTheDocument());
    expect(screen.getByText('Quest reward', { exact: false })).toBeInTheDocument();
  });

  it('gold adjustment form is rendered', async () => {
    renderWithProviders(<CharacterPage />);
    expect(screen.getByPlaceholderText(/Amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Change' })).toBeInTheDocument();
  });

  it('submitting gold adjustment calls PATCH and updates displayed gold', async () => {
    renderWithProviders(<CharacterPage />);
    const amountInput = screen.getByPlaceholderText(/Amount/i);
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '5');
    await userEvent.click(screen.getByRole('button', { name: 'Log Change' }));
    // Mock returns gold_gp: 55; GoldDisplay renders with emoji prefix
    await waitFor(() => expect(screen.getByText(/55 GP/)).toBeInTheDocument());
  });

  it('discarding an inventory item removes it from the list', async () => {
    renderWithProviders(<CharacterPage />);
    await waitFor(() => screen.getByText(MOCK_INVENTORY_ITEM.item_name));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(screen.queryByText(MOCK_INVENTORY_ITEM.item_name)).not.toBeInTheDocument());
  });
});
