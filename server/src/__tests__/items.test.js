import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const MOCK_EQUIPMENT_DETAIL = {
  index: 'shield', name: 'Shield',
  description: ['Adds +2 to AC.'], notes: [],
  equipment_categories: [{ name: 'Armor' }],
  cost: { quantity: 10, unit: 'gp' }, weight: 6,
};

const MOCK_MAGIC_DETAIL = {
  index: 'cloak-of-protection', name: 'Cloak of Protection',
  desc: ['You gain a +1 bonus to AC and saving throws while you wear this cloak.'],
  rarity: { name: 'Uncommon' },
};

function setupFetchMock({ equipResults = [], magicResults = [] } = {}) {
  return mock.method(globalThis, 'fetch', async (url) => {
    const u = url.toString();
    if (u.includes('/equipment?name=')) return jsonResponse({ results: equipResults });
    if (u.includes('/magic-items?name=')) return jsonResponse({ results: magicResults });
    if (u.includes('/equipment/')) return jsonResponse(MOCK_EQUIPMENT_DETAIL);
    if (u.includes('/magic-items/')) return jsonResponse(MOCK_MAGIC_DETAIL);
    return jsonResponse({}, 404);
  });
}

async function loginAndGetAgent(role = 'dm') {
  const agent = request.agent(app);
  const uname = `iu_${Math.random().toString(36).slice(2, 8)}`;
  await agent.post('/api/auth/register').send({ username: uname, password: 'pass12345', role });
  return agent;
}

describe('GET /api/items/search', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/items/search?q=shield');
    assert.equal(res.status, 401);
  });

  it('returns empty array for empty query', async () => {
    const agent = await loginAndGetAgent();
    const res = await agent.get('/api/items/search?q=');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('returns equipment items with correct price and category', async () => {
    const fetchMock = setupFetchMock({
      equipResults: [{ index: 'shield', name: 'Shield' }],
    });
    try {
      const agent = await loginAndGetAgent();
      const res = await agent.get('/api/items/search?q=shield');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].name, 'Shield');
      assert.equal(res.body[0].srd_default_cp, 1000); // 10 gp = 1000 cp
      assert.equal(res.body[0].category, 'Armor');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('returns magic items with DMG estimated price and rarity metadata', async () => {
    const fetchMock = setupFetchMock({
      magicResults: [{ index: 'cloak-of-protection', name: 'Cloak of Protection' }],
    });
    try {
      const agent = await loginAndGetAgent();
      const res = await agent.get('/api/items/search?q=cloak');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      const item = res.body[0];
      assert.equal(item.name, 'Cloak of Protection');
      assert.equal(item.category, 'Uncommon Magic Item');
      assert.equal(item.rarity, 'Uncommon');
      assert.equal(item.price_is_estimate, true);
      // Uncommon range: 150–900 gp → 15,000–90,000 cp
      assert.ok(item.srd_default_cp >= 15000 && item.srd_default_cp <= 90000,
        `Expected Uncommon price 15000–90000 cp, got ${item.srd_default_cp}`);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('bias=2 produces higher price than bias=-2 for same magic item', async () => {
    const fetchMock = setupFetchMock({
      magicResults: [{ index: 'cloak-of-protection', name: 'Cloak of Protection' }],
    });
    try {
      const agent = await loginAndGetAgent();
      const [generous, cutthroat] = await Promise.all([
        agent.get('/api/items/search?q=cloak&bias=-2'),
        agent.get('/api/items/search?q=cloak&bias=2'),
      ]);
      assert.equal(generous.status, 200);
      assert.equal(cutthroat.status, 200);
      // Cutthroat store should suggest a higher price than generous store
      assert.ok(
        cutthroat.body[0].srd_default_cp >= generous.body[0].srd_default_cp,
        `Expected cutthroat (${cutthroat.body[0].srd_default_cp}) >= generous (${generous.body[0].srd_default_cp})`
      );
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('bias has no effect on equipment with fixed SRD price', async () => {
    const fetchMock = setupFetchMock({
      equipResults: [{ index: 'shield', name: 'Shield' }],
    });
    try {
      const agent = await loginAndGetAgent();
      const [neutral, cutthroat] = await Promise.all([
        agent.get('/api/items/search?q=shield&bias=0'),
        agent.get('/api/items/search?q=shield&bias=2'),
      ]);
      // SRD price is fixed — bias doesn't change it
      assert.equal(neutral.body[0].srd_default_cp, cutthroat.body[0].srd_default_cp);
      assert.equal(neutral.body[0].price_is_estimate, false);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('merges equipment and magic item results', async () => {
    const fetchMock = setupFetchMock({
      equipResults: [{ index: 'shield', name: 'Shield' }],
      magicResults: [{ index: 'cloak-of-protection', name: 'Cloak of Protection' }],
    });
    try {
      const agent = await loginAndGetAgent();
      const res = await agent.get('/api/items/search?q=anything');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 2);
      const names = res.body.map(i => i.name);
      assert.ok(names.includes('Shield'));
      assert.ok(names.includes('Cloak of Protection'));
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('returns partial results when one endpoint fails', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async (url) => {
      const u = url.toString();
      if (u.includes('/equipment?name=')) throw new Error('network error');
      if (u.includes('/magic-items?name=')) return jsonResponse({ results: [{ index: 'cloak-of-protection', name: 'Cloak of Protection' }] });
      if (u.includes('/magic-items/')) return jsonResponse(MOCK_MAGIC_DETAIL);
      return jsonResponse({}, 404);
    });
    try {
      const agent = await loginAndGetAgent();
      const res = await agent.get('/api/items/search?q=cloak');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].name, 'Cloak of Protection');
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('player can also search items', async () => {
    const fetchMock = setupFetchMock({
      equipResults: [{ index: 'shield', name: 'Shield' }],
    });
    try {
      const agent = await loginAndGetAgent('player');
      const res = await agent.get('/api/items/search?q=shield');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
    } finally {
      fetchMock.mock.restore();
    }
  });
});
