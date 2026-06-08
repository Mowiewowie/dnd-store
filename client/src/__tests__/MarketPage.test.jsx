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
});
