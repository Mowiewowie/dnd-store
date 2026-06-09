import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { MarketPage } from '../pages/MarketPage.jsx';
import { server } from '../test/mocks/server.js';

describe('MarketPage', () => {
  it('renders list of stores', async () => {
    renderWithProviders(<MarketPage />);
    await waitFor(() => expect(screen.getByText('Ye Olde Shoppe')).toBeInTheDocument());
    expect(screen.getByText(/Market Square/)).toBeInTheDocument();
  });

  it('shows Open badge for open store', async () => {
    renderWithProviders(<MarketPage />);
    await waitFor(() => expect(screen.getByText('Open')).toBeInTheDocument());
  });

  it('shows empty state when no stores', async () => {
    server.use(http.get('/api/stores', () => HttpResponse.json([])));
    renderWithProviders(<MarketPage />);
    await waitFor(() => expect(screen.getByText(/No shops are open/i)).toBeInTheDocument());
  });

  it('shows Closed badge for a closed store', async () => {
    server.use(http.get('/api/stores', () => HttpResponse.json([
      { id: 2, name: 'Dusty Cellar', location: null, description: null, is_open: 0 },
    ])));
    renderWithProviders(<MarketPage />);
    await waitFor(() => expect(screen.getByText('Dusty Cellar')).toBeInTheDocument());
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('store card links to the store detail page', async () => {
    renderWithProviders(<MarketPage />);
    await waitFor(() => screen.getByText('Ye Olde Shoppe'));
    const link = screen.getByRole('link', { name: /Ye Olde Shoppe/i });
    expect(link).toHaveAttribute('href', '/market/1');
  });
});
