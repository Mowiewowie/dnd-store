import { describe, it, expect, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/helpers.jsx';
import { CampaignSelectPage } from '../pages/CampaignSelectPage.jsx';
import { server } from '../test/mocks/server.js';
import { MOCK_CAMPAIGN, MOCK_USER, MOCK_DM } from '../test/mocks/handlers.js';

afterEach(() => sessionStorage.clear());

describe('CampaignSelectPage (player)', () => {
  it('lists campaigns the player belongs to', async () => {
    renderWithProviders(<CampaignSelectPage />);
    await waitFor(() => expect(screen.getByText('The Lost Mines')).toBeInTheDocument());
  });

  it('shows DM username and member count', async () => {
    renderWithProviders(<CampaignSelectPage />);
    await waitFor(() => screen.getByText('The Lost Mines'));
    expect(screen.getByText(/dungeonmaster/i)).toBeInTheDocument();
    expect(screen.getByText(/2 members/i)).toBeInTheDocument();
  });

  it('shows Join Campaign button', async () => {
    renderWithProviders(<CampaignSelectPage />);
    await waitFor(() => expect(screen.getByText(/Join Campaign with Code/i)).toBeInTheDocument());
  });

  it('shows join form when button clicked', async () => {
    renderWithProviders(<CampaignSelectPage />);
    await waitFor(() => screen.getByText(/Join Campaign with Code/i));
    await userEvent.click(screen.getByText(/Join Campaign with Code/i));
    expect(screen.getByPlaceholderText(/8-character code/i)).toBeInTheDocument();
  });

  it('shows empty state when no campaigns', async () => {
    server.use(http.get('/api/campaigns', () => HttpResponse.json([])));
    renderWithProviders(<CampaignSelectPage />);
    await waitFor(() => expect(screen.getByText(/haven't joined/i)).toBeInTheDocument());
  });
});

describe('CampaignSelectPage (DM)', () => {
  beforeEach(() => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json(MOCK_DM)));
    server.use(http.get('/api/campaigns', () => HttpResponse.json([{ ...MOCK_CAMPAIGN, dm_id: MOCK_DM.id }])));
  });

  it('shows Create New Campaign button for DMs', async () => {
    renderWithProviders(<CampaignSelectPage />);
    await waitFor(() => expect(screen.getByText(/Create New Campaign/i)).toBeInTheDocument());
  });

  it('shows join code for DM-owned campaigns', async () => {
    renderWithProviders(<CampaignSelectPage />);
    await waitFor(() => screen.getByText('The Lost Mines'));
    expect(screen.getByText(/ABCD1234/)).toBeInTheDocument();
  });

  it('shows create form when button clicked', async () => {
    renderWithProviders(<CampaignSelectPage />);
    await waitFor(() => screen.getByText(/Create New Campaign/i));
    await userEvent.click(screen.getByText(/Create New Campaign/i));
    expect(screen.getByPlaceholderText(/Campaign name/i)).toBeInTheDocument();
  });
});
