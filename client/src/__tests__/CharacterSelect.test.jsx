import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { CharacterSelectPage } from '../pages/CharacterSelectPage.jsx';
import { server } from '../test/mocks/server.js';
import { MOCK_CHARACTER } from '../test/mocks/handlers.js';

describe('CharacterSelectPage', () => {
  it('shows existing characters', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => expect(screen.getByText('Thorin')).toBeInTheDocument());
    expect(screen.getByText('Fighter')).toBeInTheDocument();
  });

  it('shows Create New Character option', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => expect(screen.getByText('+ Create New Character')).toBeInTheDocument());
  });

  it('shows create form when Create New Character is clicked', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('+ Create New Character'));
    await userEvent.click(screen.getByText('+ Create New Character'));
    expect(screen.getByPlaceholderText('Character name')).toBeInTheDocument();
  });

  it('shows no characters state when list is empty', async () => {
    server.use(http.get('/api/characters', () => HttpResponse.json([])));
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => expect(screen.getByText('+ Create New Character')).toBeInTheDocument());
    expect(screen.queryByText('Thorin')).not.toBeInTheDocument();
  });

  it('shows error for duplicate character name', async () => {
    server.use(http.post('/api/characters', () =>
      HttpResponse.json({ error: 'You already have a character with that name' }, { status: 409 })
    ));
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('+ Create New Character'));
    await userEvent.click(screen.getByText('+ Create New Character'));
    await userEvent.type(screen.getByPlaceholderText('Character name'), 'Thorin');
    await userEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(screen.getByText('You already have a character with that name')).toBeInTheDocument());
  });

  it('shows error for empty character name', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('+ Create New Character'));
    await userEvent.click(screen.getByText('+ Create New Character'));
    const submitBtn = screen.getByText('Create');
    await userEvent.click(submitBtn);
    const input = screen.getByPlaceholderText('Character name');
    expect(input).toBeInvalid();
  });
});

describe('CharacterSelectPage — delete character', () => {
  it('shows a delete button for each character card', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    expect(screen.getByRole('button', { name: 'Delete Thorin' })).toBeInTheDocument();
  });

  it('delete button has no visible text — icon only', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    const btn = screen.getByRole('button', { name: 'Delete Thorin' });
    expect(btn.textContent.trim()).toBe('');
  });

  it('clicking delete opens the confirmation modal', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Thorin' }));
    expect(screen.getByText('Delete Character')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type the name to confirm')).toBeInTheDocument();
  });

  it('modal shows the character name in the confirmation prompt', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Thorin' }));
    expect(screen.getByText('Thorin', { selector: 'span' })).toBeInTheDocument();
  });

  it('Delete button is disabled before any name is typed', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Thorin' }));
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('Delete button stays disabled when wrong name is typed', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Thorin' }));
    await userEvent.type(screen.getByPlaceholderText('Type the name to confirm'), 'Thor');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('Delete button enables when the exact character name is typed', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Thorin' }));
    await userEvent.type(screen.getByPlaceholderText('Type the name to confirm'), 'Thorin');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).not.toBeDisabled());
  });

  it('confirming delete removes the character from the list', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Thorin' }));
    await userEvent.type(screen.getByPlaceholderText('Type the name to confirm'), 'Thorin');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Thorin')).not.toBeInTheDocument());
  });

  it('confirming delete closes the modal', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Thorin' }));
    await userEvent.type(screen.getByPlaceholderText('Type the name to confirm'), 'Thorin');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Delete Character')).not.toBeInTheDocument());
  });

  it('cancelling the modal closes it without removing the character', async () => {
    renderWithProviders(<CharacterSelectPage />);
    await waitFor(() => screen.getByText('Thorin'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Thorin' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete Character')).not.toBeInTheDocument();
    expect(screen.getByText('Thorin')).toBeInTheDocument();
  });
});
