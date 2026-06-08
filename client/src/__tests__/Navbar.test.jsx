import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { MOCK_CHARACTER, MOCK_CAMPAIGN } from '../test/mocks/handlers.js';

beforeEach(() => {
  sessionStorage.setItem('dnd_character', JSON.stringify(MOCK_CHARACTER));
  sessionStorage.setItem('dnd_campaign', JSON.stringify(MOCK_CAMPAIGN));
});

afterEach(() => sessionStorage.clear());

describe('Navbar', () => {
  it('shows "Purchase History" link when a character is active', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('Purchase History')).toBeInTheDocument());
  });

  it('does not use the old "My Character" label', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('Purchase History'));
    expect(screen.queryByText('My Character')).not.toBeInTheDocument();
  });

  it('shows "Switch Character" button when a character is active', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('Switch Character')).toBeInTheDocument());
  });

  it('shows campaign name in the navbar', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('The Lost Mines')).toBeInTheDocument());
  });

  it('shows "Switch Campaign" button when a campaign is active', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('Switch Campaign')).toBeInTheDocument());
  });

  it('clicking "Switch Character" clears character from sessionStorage', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('Switch Character'));
    await userEvent.click(screen.getByText('Switch Character'));
    expect(sessionStorage.getItem('dnd_character')).toBeNull();
  });

  it('clicking "Switch Campaign" clears campaign and character from sessionStorage', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('Switch Campaign'));
    await userEvent.click(screen.getByText('Switch Campaign'));
    expect(sessionStorage.getItem('dnd_campaign')).toBeNull();
    expect(sessionStorage.getItem('dnd_character')).toBeNull();
  });

  it('hides nav links when no character is selected', async () => {
    sessionStorage.removeItem('dnd_character');
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.queryByText('Purchase History')).not.toBeInTheDocument());
    expect(screen.queryByText('Switch Character')).not.toBeInTheDocument();
  });
});
