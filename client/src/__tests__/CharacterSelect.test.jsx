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
