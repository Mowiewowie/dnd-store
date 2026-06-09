import { http, HttpResponse } from 'msw';

export const MOCK_USER = { id: 1, username: 'testuser', role: 'player' };
export const MOCK_DM = { id: 2, username: 'dungeonmaster', role: 'dm' };
export const MOCK_CHARACTER = { id: 1, name: 'Thorin', class: 'Fighter', gold_gp: 50, gold_sp: 0, gold_cp: 0 };
export const MOCK_CAMPAIGN = { id: 1, name: 'The Lost Mines', join_code: 'ABCD1234', dm_id: 2, dm_username: 'dungeonmaster', member_count: 2 };
export const MOCK_STORE = { id: 1, name: "Ye Olde Shoppe", location: 'Market Square', description: null, is_open: 1, price_bias: 0 };
export const MOCK_LISTING = {
  id: 1, store_id: 1, item_name: 'Longsword', item_description: 'A sturdy blade.',
  custom_price_cp: 1500, srd_default_cp: 1500, effective_price_cp: 1500, quantity: 5,
};
export const MOCK_INVENTORY_ITEM = {
  id: 10, character_id: 1, item_name: 'Old Cloak', item_description: 'A worn travelling cloak.',
  item_srd_index: null, quantity: 1, base_value_cp: 1000, rarity: null, acquired_at: '2026-01-01T00:00:00.000Z',
};
export const MOCK_CAMPAIGN_CHARACTERS = [
  { id: 1, name: 'Thorin', class: 'Fighter', gold_gp: 50, gold_sp: 0, gold_cp: 0, username: 'testuser' },
  { id: 2, name: 'Legolas', class: 'Ranger', gold_gp: 30, gold_sp: 5, gold_cp: 0, username: 'player2' },
];

export const handlers = [
  http.get('/api/auth/me', () => HttpResponse.json(MOCK_USER)),
  http.post('/api/auth/login', () => HttpResponse.json(MOCK_USER)),
  http.post('/api/auth/register', () => HttpResponse.json(MOCK_USER, { status: 201 })),
  http.post('/api/auth/logout', () => HttpResponse.json({ ok: true })),

  http.get('/api/campaigns', () => HttpResponse.json([MOCK_CAMPAIGN])),
  http.post('/api/campaigns', () => HttpResponse.json(MOCK_CAMPAIGN, { status: 201 })),
  http.post('/api/campaigns/join', () => HttpResponse.json(MOCK_CAMPAIGN, { status: 201 })),

  http.get('/api/characters', () => HttpResponse.json([MOCK_CHARACTER])),
  http.post('/api/characters', () => HttpResponse.json(MOCK_CHARACTER, { status: 201 })),
  http.get('/api/characters/campaign', () => HttpResponse.json(MOCK_CAMPAIGN_CHARACTERS)),
  http.get('/api/characters/:id/transactions', () => HttpResponse.json([])),
  http.get('/api/characters/:id/inventory', () => HttpResponse.json([MOCK_INVENTORY_ITEM])),
  http.post('/api/characters/:id/inventory', () => HttpResponse.json(
    { id: 99, character_id: 1, item_name: 'Dragon Scale', item_description: null, quantity: 1, base_value_cp: 5000 },
    { status: 201 }
  )),
  http.delete('/api/characters/:charId/inventory/:itemId', () => HttpResponse.json({ ok: true })),
  http.patch('/api/characters/:id/money', () => HttpResponse.json(
    { ...MOCK_CHARACTER, gold_gp: 55 }
  )),

  http.get('/api/stores', () => HttpResponse.json([MOCK_STORE])),
  http.get('/api/stores/:id', () => HttpResponse.json({ ...MOCK_STORE, listings: [MOCK_LISTING] })),
  http.put('/api/stores/:id', () => HttpResponse.json({ ...MOCK_STORE, is_open: 0 })),
  http.post('/api/stores/:id/sell', () => HttpResponse.json({
    gold_received_cp: 750,
    character: { ...MOCK_CHARACTER, gold_gp: 57, gold_sp: 5, gold_cp: 0 },
  })),

  http.post('/api/purchase', () => HttpResponse.json({
    transaction: { id: 1, item_name: 'Longsword', price_paid_cp: 1500 },
    character: { ...MOCK_CHARACTER, gold_gp: 35, gold_sp: 0, gold_cp: 0 },
  })),

  http.get('/api/dm/settings', () => HttpResponse.json({ price_multiplier: '1.0' })),
  http.put('/api/dm/settings', () => HttpResponse.json({ price_multiplier: '1.5' })),

  http.get('/api/items/search', () => HttpResponse.json([
    { index: 'longsword', name: 'Longsword', srd_default_cp: 1500, description: 'A martial weapon.' },
  ])),
];
