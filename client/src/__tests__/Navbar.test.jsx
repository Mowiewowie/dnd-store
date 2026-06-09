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
  it('shows "My Character" link when a character is active', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('My Character')).toBeInTheDocument());
  });

  it('does not use the old "Purchase History" label', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('My Character'));
    expect(screen.queryByText('Purchase History')).not.toBeInTheDocument();
  });

  it('shows campaign name in the navbar', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.getByText('The Lost Mines')).toBeInTheDocument());
  });

  it('shows user avatar button', async () => {
    renderWithProviders(<Navbar />);
    // Avatar shows first letter of username
    await waitFor(() => expect(screen.getByRole('button', { name: /t/i })).toBeInTheDocument());
  });

  it('"Switch Character" appears in dropdown after opening it', async () => {
    renderWithProviders(<Navbar />);
    // Open the dropdown by clicking the avatar button
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

  it('clicking "Switch Character" in dropdown clears character from sessionStorage', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('testuser'));
    await userEvent.click(screen.getByText('testuser'));
    await userEvent.click(screen.getByText('Switch Character'));
    expect(sessionStorage.getItem('dnd_character')).toBeNull();
  });

  it('clicking "Switch Campaign" in dropdown clears campaign and character from sessionStorage', async () => {
    renderWithProviders(<Navbar />);
    await waitFor(() => screen.getByText('testuser'));
    await userEvent.click(screen.getByText('testuser'));
    await userEvent.click(screen.getByText('Switch Campaign'));
    expect(sessionStorage.getItem('dnd_campaign')).toBeNull();
    expect(sessionStorage.getItem('dnd_character')).toBeNull();
  });

  it('hides nav links when no character is selected', async () => {
    sessionStorage.removeItem('dnd_character');
    renderWithProviders(<Navbar />);
    await waitFor(() => expect(screen.queryByText('My Character')).not.toBeInTheDocument());
    expect(screen.queryByText('Market')).not.toBeInTheDocument();
  });
});
