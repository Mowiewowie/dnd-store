import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { DMStorePage } from '../pages/DMStorePage.jsx';
import { server } from '../test/mocks/server.js';

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, useParams: () => ({ id: '1' }) };
});

const MOCK_DM_STORE = {
  id: 1,
  name: 'Ye Olde Shoppe',
  is_open: 1,
  price_bias: 0,
  listings: [
    { id: 1, item_name: 'Longsword', effective_price_cp: 1500, custom_price_cp: null, srd_default_cp: 1500, quantity: 5 },
    { id: 2, item_name: 'Dragon Scale', effective_price_cp: 50000, custom_price_cp: 50000, srd_default_cp: null, quantity: 0 },
  ],
};

function putHandler(onRequest) {
  return http.put('/api/listings/:id', async ({ request, params }) => {
    const body = await request.json();
    onRequest?.({ id: Number(params.id), body });
    return HttpResponse.json({ id: Number(params.id), quantity: body.quantity });
  });
}

beforeEach(() => {
  server.use(
    http.get('/api/stores/:id', () => HttpResponse.json(MOCK_DM_STORE)),
    putHandler(),
  );
});

describe('DMStorePage — listings', () => {
  it('renders all listing names including zero-quantity items', async () => {
    renderWithProviders(<DMStorePage />);
    await waitFor(() => expect(screen.getByText('Longsword')).toBeInTheDocument());
    expect(screen.getByText('Dragon Scale')).toBeInTheDocument();
  });

  it('shows quantity stepper controls (− and +) for every listing', async () => {
    renderWithProviders(<DMStorePage />);
    await waitFor(() => screen.getByText('Longsword'));
    expect(screen.getAllByTitle('Decrease quantity')).toHaveLength(2);
    expect(screen.getAllByTitle('Increase quantity')).toHaveLength(2);
  });

  it('shows "Out of stock" label on zero-quantity listing', async () => {
    renderWithProviders(<DMStorePage />);
    await waitFor(() => screen.getByText('Dragon Scale'));
    expect(screen.getByText(/Out of stock/i)).toBeInTheDocument();
  });

  it('zero-quantity listing has no "Out of stock" on positive-quantity listing', async () => {
    renderWithProviders(<DMStorePage />);
    await waitFor(() => screen.getByText('Longsword'));
    // Only one "Out of stock" label — the Longsword (qty 5) should not show it
    expect(screen.getAllByText(/Out of stock/i)).toHaveLength(1);
  });
});

describe('DMStorePage — quantity controls', () => {
  it('clicking + calls PUT /listings/:id with incremented quantity', async () => {
    const calls = [];
    server.use(putHandler(c => calls.push(c)));

    renderWithProviders(<DMStorePage />);
    await waitFor(() => screen.getByText('Longsword'));
    await userEvent.click(screen.getAllByTitle('Increase quantity')[0]);

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ id: 1, body: { quantity: 6 } });
  });

  it('clicking − calls PUT /listings/:id with decremented quantity', async () => {
    const calls = [];
    server.use(putHandler(c => calls.push(c)));

    renderWithProviders(<DMStorePage />);
    await waitFor(() => screen.getByText('Longsword'));
    await userEvent.click(screen.getAllByTitle('Decrease quantity')[0]);

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ id: 1, body: { quantity: 4 } });
  });

  it('clicking − on a zero-quantity listing sends 0, never goes negative', async () => {
    const calls = [];
    server.use(putHandler(c => calls.push(c)));

    renderWithProviders(<DMStorePage />);
    await waitFor(() => screen.getByText('Dragon Scale'));
    // Second listing (index 1) is Dragon Scale with qty 0
    await userEvent.click(screen.getAllByTitle('Decrease quantity')[1]);

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ id: 2, body: { quantity: 0 } });
  });

  it('typing in the qty input and pressing Enter calls PUT with the entered value', async () => {
    const calls = [];
    server.use(putHandler(c => calls.push(c)));

    renderWithProviders(<DMStorePage />);
    await waitFor(() => screen.getByText('Longsword'));

    // The form has 2 spinbuttons (price, qty); listing cards follow
    const spinbuttons = screen.getAllByRole('spinbutton');
    // Index 2 is the first listing's quantity input
    const longswordQtyInput = spinbuttons[2];
    await userEvent.clear(longswordQtyInput);
    await userEvent.type(longswordQtyInput, '10');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[calls.length - 1].body).toEqual({ quantity: 10 });
  });

  it('blurring the qty input after typing commits the change via PUT', async () => {
    const calls = [];
    server.use(putHandler(c => calls.push(c)));

    renderWithProviders(<DMStorePage />);
    await waitFor(() => screen.getByText('Longsword'));

    const spinbuttons = screen.getAllByRole('spinbutton');
    const longswordQtyInput = spinbuttons[2];
    await userEvent.clear(longswordQtyInput);
    await userEvent.type(longswordQtyInput, '3');
    // Blur by clicking something else
    await userEvent.click(screen.getByText('Longsword'));

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[calls.length - 1].body).toEqual({ quantity: 3 });
  });
});
