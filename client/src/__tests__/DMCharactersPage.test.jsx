import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { DMCharactersPage } from '../pages/DMCharactersPage.jsx';
import { DMCharacterPage } from '../pages/DMCharacterPage.jsx';
import { server } from '../test/mocks/server.js';
import { MOCK_CAMPAIGN_CHARACTERS, MOCK_INVENTORY_ITEM, MOCK_CHARACTER, MOCK_DM } from '../test/mocks/handlers.js';

// Mock useParams and useNavigate for DMCharacterPage
import { vi } from 'vitest';
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, useParams: () => ({ id: '1' }), useNavigate: () => () => {} };
});

describe('DMCharactersPage', () => {
  it('shows list of campaign characters', async () => {
    renderWithProviders(<DMCharactersPage />);
    await waitFor(() => expect(screen.getByText('Thorin')).toBeInTheDocument());
    expect(screen.getByText('Legolas')).toBeInTheDocument();
  });

  it('shows player username alongside character', async () => {
    renderWithProviders(<DMCharactersPage />);
    await waitFor(() => expect(screen.getByText(/testuser/i)).toBeInTheDocument());
  });

  it('shows empty state when no characters exist', async () => {
    server.use(http.get('/api/characters/campaign', () => HttpResponse.json([])));
    renderWithProviders(<DMCharactersPage />);
    await waitFor(() => expect(screen.getByText(/No characters have been created/i)).toBeInTheDocument());
  });
});

describe('DMCharacterPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/characters/campaign', () => HttpResponse.json(MOCK_CAMPAIGN_CHARACTERS)),
      http.get('/api/characters/:id/inventory', () => HttpResponse.json([MOCK_INVENTORY_ITEM])),
      http.get('/api/characters/:id/transactions', () => HttpResponse.json([])),
    );
  });

  it('renders character name from campaign list', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => expect(screen.getByText('Thorin')).toBeInTheDocument());
  });

  it('shows inventory tab with items', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => expect(screen.getByText(MOCK_INVENTORY_ITEM.item_name)).toBeInTheDocument());
  });

  it('shows the grant item form', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByPlaceholderText(/Item name/i));
    expect(screen.getByPlaceholderText(/Item name/i)).toBeInTheDocument();
  });

  it('shows gold adjustment form', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('switching to History tab shows empty state when no transactions', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByRole('button', { name: 'History' }));
    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    await waitFor(() => expect(screen.getByText(/No history yet/i)).toBeInTheDocument());
  });

  it('shows history entries with transaction type labels', async () => {
    server.use(http.get('/api/characters/:id/transactions', () => HttpResponse.json([
      { id: 1, item_name: 'Sword', price_paid_cp: 1500, quantity: 1, type: 'purchase', notes: null, purchased_at: '2026-01-01T00:00:00.000Z' },
      { id: 2, item_name: 'Gold adjustment', price_paid_cp: 200, quantity: 1, type: 'dm_adjustment', notes: 'Quest loot', purchased_at: '2026-01-02T00:00:00.000Z' },
    ])));
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByRole('button', { name: 'History' }));
    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    await waitFor(() => expect(screen.getByText('Sword')).toBeInTheDocument());
    expect(screen.getByText(/Quest loot/i)).toBeInTheDocument();
    expect(screen.getByText('DM Grant')).toBeInTheDocument();
  });

  it('renders a back navigation button', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByText('Thorin'));
    expect(screen.getByRole('button', { name: /Characters/i })).toBeInTheDocument();
  });

  it('submitting the grant item form adds the item to the inventory list', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByPlaceholderText(/Item name/i));
    await userEvent.type(screen.getByPlaceholderText(/Item name \*/i), 'Dragon Scale');
    await userEvent.click(screen.getByRole('button', { name: 'Add to Inventory' }));
    await waitFor(() => expect(screen.getByText('Dragon Scale')).toBeInTheDocument());
  });

  it('clicking Remove on an inventory item removes it from the list', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByText(MOCK_INVENTORY_ITEM.item_name));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText(MOCK_INVENTORY_ITEM.item_name)).not.toBeInTheDocument());
  });

  it('submitting the gold adjustment form updates the displayed gold', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Apply' }));
    await userEvent.type(screen.getByPlaceholderText(/Amount/i), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    // mock PATCH returns gold_gp: 55
    await waitFor(() => expect(screen.getByText(/55 GP/)).toBeInTheDocument());
  });

  it('gold adjustment shows an error when amount is empty', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Apply' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText(/Enter a positive amount/i)).toBeInTheDocument();
  });

  it('shows character class and player username in the summary card', async () => {
    renderWithProviders(<DMCharacterPage />);
    await waitFor(() => screen.getByText('Thorin'));
    expect(screen.getByText('Fighter')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});
