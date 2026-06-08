import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { server } from '../test/mocks/server.js';
import { MOCK_USER } from '../test/mocks/handlers.js';

describe('LoginPage', () => {
  it('renders login form by default', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('switches to register tab', async () => {
    renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByText('Create Account'));
    expect(screen.getByText('Join the Bazaar')).toBeInTheDocument();
  });

  it('shows role selector on register tab', async () => {
    renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByText('Create Account'));
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('shows error on failed login', async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.json({ error: 'Invalid username or password' }, { status: 401 })));
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText('Enter username'), 'wrong');
    await userEvent.type(screen.getByPlaceholderText('Enter password'), 'wrong');
    await userEvent.click(screen.getByText('Enter the Bazaar'));
    await waitFor(() => expect(screen.getByText('Invalid username or password')).toBeInTheDocument());
  });

  it('shows error for duplicate username on register', async () => {
    server.use(http.post('/api/auth/register', () => HttpResponse.json({ error: 'Username already taken' }, { status: 409 })));
    renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByText('Create Account'));
    await userEvent.type(screen.getByPlaceholderText('Enter username'), 'dupe');
    await userEvent.type(screen.getByPlaceholderText('Enter password'), 'password123');
    await userEvent.click(screen.getByText('Join the Bazaar'));
    await waitFor(() => expect(screen.getByText('Username already taken')).toBeInTheDocument());
  });
});
