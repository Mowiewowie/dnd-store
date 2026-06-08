import { http, HttpResponse } from 'msw';

export const MOCK_USER = { id: 1, username: 'testuser', role: 'player' };
export const MOCK_DM = { id: 2, username: 'dungeonmaster', role: 'dm' };
export const MOCK_CHARACTER = { id: 1, name: 'Thorin', class: 'Fighter', gold_gp: 50, gold_sp: 0, gold_cp: 0 };
export const MOCK_STORE = { id: 1, name: "Ye Olde Shoppe", location: 'Market Square', description: null, is_open: 1 };
export const MOCK_LISTING = {
  id: 1, store_id: 1, item_name: 'Longsword', item_description: 'A sturdy blade.',
  custom_price_cp: 1500, srd_default_cp: 1500, effective_price_cp: 1500, quantity: 5,
};

export const handlers = [
  http.get('/api/auth/me', () => HttpResponse.json(MOCK_USER)),
  http.post('/api/auth/login', () => HttpResponse.json(MOCK_USER)),
  http.post('/api/auth/register', () => HttpResponse.json(MOCK_USER, { status: 201 })),
  http.post('/api/auth/logout', () => HttpResponse.json({ ok: true })),

  http.get('/api/characters', () => HttpResponse.json([MOCK_CHARACTER])),
  http.post('/api/characters', () => HttpResponse.json(MOCK_CHARACTER, { status: 201 })),
  http.get('/api/characters/1/transactions', () => HttpResponse.json([])),

  http.get('/api/stores', () => HttpResponse.json([MOCK_STORE])),
  http.get('/api/stores/1', () => HttpResponse.json({ ...MOCK_STORE, listings: [MOCK_LISTING] })),

  http.post('/api/purchase', () => HttpResponse.json({
    transaction: { id: 1, item_name: 'Longsword', price_paid_cp: 1500 },
    character: { ...MOCK_CHARACTER, gold_gp: 35, gold_sp: 0, gold_cp: 0 },
  })),

  http.get('/api/items/search', () => HttpResponse.json([
    { index: 'longsword', name: 'Longsword', srd_default_cp: 1500, description: 'A martial weapon.' },
  ])),
];
