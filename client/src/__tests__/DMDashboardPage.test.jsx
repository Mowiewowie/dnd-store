import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { DMDashboardPage } from '../pages/DMDashboardPage.jsx';
import { server } from '../test/mocks/server.js';
import { MOCK_STORE } from '../test/mocks/handlers.js';

describe('DMDashboardPage', () => {
  it('renders "Markets" as the page heading', async () => {
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => expect(screen.getByText('Markets')).toBeInTheDocument());
  });

  it('shows store name from the API', async () => {
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => expect(screen.getByText('Ye Olde Shoppe')).toBeInTheDocument());
  });

  it('shows store location when present', async () => {
    server.use(http.get('/api/stores', () => HttpResponse.json([
      { ...MOCK_STORE, location: 'Market Square' },
    ])));
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => expect(screen.getByText(/Market Square/)).toBeInTheDocument());
  });

  it('shows "No stores yet" when the store list is empty', async () => {
    server.use(http.get('/api/stores', () => HttpResponse.json([])));
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => expect(screen.getByText(/No stores yet/i)).toBeInTheDocument());
  });

  it('shows an Open toggle button for an open store', async () => {
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => screen.getByText('Ye Olde Shoppe'));
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('clicking Open toggle changes the button label to Closed', async () => {
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Closed' })).toBeInTheDocument());
  });

  it('shows the Create Store form with name input and submit button', async () => {
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => screen.getByText('Ye Olde Shoppe'));
    expect(screen.getByPlaceholderText(/Store name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Store' })).toBeInTheDocument();
  });

  it('creating a store shows a success toast', async () => {
    server.use(http.post('/api/stores', async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({ ...MOCK_STORE, id: 99, name: body.name }, { status: 201 });
    }));
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => screen.getByPlaceholderText(/Store name/i));
    await userEvent.type(screen.getByPlaceholderText(/Store name/i), 'Iron Forge');
    await userEvent.click(screen.getByRole('button', { name: 'Create Store' }));
    await waitFor(() => expect(screen.getByText('Store created!')).toBeInTheDocument());
  });

  it('creating a store adds it to the list', async () => {
    server.use(http.post('/api/stores', async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({ ...MOCK_STORE, id: 99, name: body.name }, { status: 201 });
    }));
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => screen.getByPlaceholderText(/Store name/i));
    await userEvent.type(screen.getByPlaceholderText(/Store name/i), 'Iron Forge');
    await userEvent.click(screen.getByRole('button', { name: 'Create Store' }));
    await waitFor(() => expect(screen.getByText('Iron Forge')).toBeInTheDocument());
  });

  it('shows the Global Price Multiplier settings form', async () => {
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => screen.getByText('Ye Olde Shoppe'));
    expect(screen.getByText(/Global Price Multiplier/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('saving the price multiplier shows a success toast', async () => {
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Price multiplier saved!')).toBeInTheDocument());
  });

  it('price multiplier stepper has − and + buttons', async () => {
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => screen.getByText(/Global Price Multiplier/i));
    const minusButtons = screen.getAllByRole('button', { name: '−' });
    const plusButtons = screen.getAllByRole('button', { name: '+' });
    expect(minusButtons.length).toBeGreaterThan(0);
    expect(plusButtons.length).toBeGreaterThan(0);
  });

  it('store name is clickable as a full card row', async () => {
    renderWithProviders(<DMDashboardPage />);
    await waitFor(() => screen.getByText('Ye Olde Shoppe'));
    // Store name is now a <p> inside a clickable div, not a <Link>
    const storeName = screen.getByText('Ye Olde Shoppe');
    expect(storeName.tagName).toBe('P');
  });
});
