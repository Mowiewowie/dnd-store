import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { MOCK_CHARACTER, MOCK_CAMPAIGN, MOCK_DM } from '../test/mocks/handlers.js';
import { server } from '../test/mocks/server.js';

beforeEach(() => {
  sessionStorage.setItem('dnd_character', JSON.stringify(MOCK_CHARACTER));
  sessionStorage.setItem('dnd_campaign', JSON.stringify(MOCK_CAMPAIGN));
});

afterEach(() => sessionStorage.clear());

describe('Navbar — nav links', () => {
  it('shows "My Character" link when a character is active', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('My Character')).toBeInTheDocument());
  });

  it('does not use the old "Purchase History" label', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('My Character'));
    expect(screen.queryByText('Purchase History')).not.toBeInTheDocument();
  });

  it('hides nav links when no character is selected', async () => {
    sessionStorage.removeItem('dnd_character');
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.queryByText('My Character')).not.toBeInTheDocument());
    expect(screen.queryByText('Market')).not.toBeInTheDocument();
  });

  it('shows DM Panel link for DM users', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json(MOCK_DM)));
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('DM Panel')).toBeInTheDocument());
  });

  it('does not show DM Panel link for player users', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('My Character'));
    expect(screen.queryByText('DM Panel')).not.toBeInTheDocument();
  });
});

describe('Navbar — logo', () => {
  it('logo links to "/" (root), not "/market"', async () => {
    renderWithProviders(<Navbar />);
    // Find the span with the logo text, then walk up to the <a> tag
    await waitFor(() => screen.getByText(/The Adventurer's Bazaar/));
    const logoSpan = screen.getByText(/The Adventurer's Bazaar/);
    expect(logoSpan.closest('a')).toHaveAttribute('href', '/');
  });

  it('logo does not link to /market', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText(/The Adventurer's Bazaar/));
    const logoSpan = screen.getByText(/The Adventurer's Bazaar/);
    expect(logoSpan.closest('a')).not.toHaveAttribute('href', '/market');
  });
});

describe('Navbar — campaign', () => {
  it('shows campaign name in the navbar', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('The Lost Mines')).toBeInTheDocument());
  });

  it('shows campaign join code in the navbar', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('ABCD1234')).toBeInTheDocument());
  });

  it('shows a copy button next to the join code', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('ABCD1234'));
    expect(screen.getByTitle('Copy to clipboard')).toBeInTheDocument();
  });
});

describe('Navbar — user dropdown', () => {
  it('shows user avatar button with first letter of username', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByRole('button', { name: /t/i })).toBeInTheDocument());
  });

  it('"Switch Character" appears in dropdown after opening it', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('testuser'));
    await userEvent.click(screen.getByText('testuser'));
    expect(screen.getByText('Switch Character')).toBeInTheDocument();
  });

  it('"Switch Campaign" appears in dropdown after opening it', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('testuser'));
    await userEvent.click(screen.getByText('testuser'));
    expect(screen.getByText('Switch Campaign')).toBeInTheDocument();
  });

  it('"Logout" appears in dropdown after opening it', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('testuser'));
    await userEvent.click(screen.getByText('testuser'));
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('clicking "Switch Character" clears character from sessionStorage', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('testuser'));
    await userEvent.click(screen.getByText('testuser'));
    await userEvent.click(screen.getByText('Switch Character'));
    expect(sessionStorage.getItem('dnd_character')).toBeNull();
  });

  it('clicking "Switch Campaign" clears campaign and character from sessionStorage', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('testuser'));
    await userEvent.click(screen.getByText('testuser'));
    await userEvent.click(screen.getByText('Switch Campaign'));
    expect(sessionStorage.getItem('dnd_campaign')).toBeNull();
    expect(sessionStorage.getItem('dnd_character')).toBeNull();
  });
});
