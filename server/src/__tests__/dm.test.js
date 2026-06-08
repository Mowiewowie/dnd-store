import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

async function loginAsDM(username) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'dmpass123', role: 'dm' });
  return agent;
}

async function loginAsPlayer(username) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'playerpass', role: 'player' });
  return agent;
}

describe('DM Settings', () => {
  it('DM can read settings', async () => {
    const dm = await loginAsDM('dm_s1');
    const res = await dm.get('/api/dm/settings');
    assert.equal(res.status, 200);
    assert.ok(res.body.price_multiplier !== undefined);
  });

  it('DM can update price multiplier', async () => {
    const dm = await loginAsDM('dm_s2');
    const res = await dm.put('/api/dm/settings').send({ price_multiplier: 1.5 });
    assert.equal(res.status, 200);
    assert.equal(res.body.price_multiplier, '1.5');
  });

  it('rejects invalid price_multiplier (zero)', async () => {
    const dm = await loginAsDM('dm_s3');
    const res = await dm.put('/api/dm/settings').send({ price_multiplier: 0 });
    assert.equal(res.status, 400);
  });

  it('rejects invalid price_multiplier (negative)', async () => {
    const dm = await loginAsDM('dm_s4');
    const res = await dm.put('/api/dm/settings').send({ price_multiplier: -1 });
    assert.equal(res.status, 400);
  });

  it('player cannot update settings', async () => {
    const player = await loginAsPlayer('dm_pl1');
    const res = await player.put('/api/dm/settings').send({ price_multiplier: 99 });
    assert.equal(res.status, 403);
  });

  it('player cannot read settings', async () => {
    const player = await loginAsPlayer('dm_pl2');
    const res = await player.get('/api/dm/settings');
    assert.equal(res.status, 403);
  });
});

describe('Stores (DM management)', () => {
  it('DM can create a store', async () => {
    const dm = await loginAsDM('dm_st1');
    const res = await dm.post('/api/stores').send({ name: 'Ye Olde Shoppe', location: 'Market District' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Ye Olde Shoppe');
    assert.equal(res.body.is_open, 1);
  });

  it('player cannot create a store', async () => {
    const player = await loginAsPlayer('st_pl1');
    const res = await player.post('/api/stores').send({ name: 'Sneaky Shop' });
    assert.equal(res.status, 403);
  });

  it('DM can toggle store open/closed', async () => {
    const dm = await loginAsDM('dm_st2');
    const store = await dm.post('/api/stores').send({ name: 'Toggle Shop' });
    const res = await dm.put(`/api/stores/${store.body.id}`).send({ is_open: false });
    assert.equal(res.status, 200);
    assert.equal(res.body.is_open, 0);
  });

  it('player cannot see closed stores', async () => {
    const dm = await loginAsDM('dm_st3');
    const player = await loginAsPlayer('st_pl2');
    const store = await dm.post('/api/stores').send({ name: 'Closed Store' });
    await dm.put(`/api/stores/${store.body.id}`).send({ is_open: false });

    const res = await player.get('/api/stores');
    const names = res.body.map(s => s.name);
    assert.ok(!names.includes('Closed Store'));
  });

  it('DM can see closed stores', async () => {
    const dm = await loginAsDM('dm_st4');
    const store = await dm.post('/api/stores').send({ name: 'Hidden Store' });
    await dm.put(`/api/stores/${store.body.id}`).send({ is_open: false });

    const res = await dm.get('/api/stores');
    const names = res.body.map(s => s.name);
    assert.ok(names.includes('Hidden Store'));
  });

  it('rejects store with empty name', async () => {
    const dm = await loginAsDM('dm_st5');
    const res = await dm.post('/api/stores').send({ name: '' });
    assert.equal(res.status, 400);
  });
});
