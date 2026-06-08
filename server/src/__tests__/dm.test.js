import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

async function loginAsDM(username) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'dmpass123', role: 'dm' });
  const camp = await agent.post('/api/campaigns').send({ name: 'DMTestCamp' });
  return { agent, campaignId: camp.body.id, joinCode: camp.body.join_code };
}

async function loginAsPlayer(username, joinCode) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'playerpass' });
  await agent.post('/api/campaigns/join').send({ code: joinCode });
  return agent;
}

describe('DM Settings', () => {
  it('DM can read settings', async () => {
    const { agent, campaignId } = await loginAsDM('dm_s1');
    const res = await agent.get('/api/dm/settings').set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 200);
    assert.ok(res.body.price_multiplier !== undefined);
  });

  it('DM can update price multiplier', async () => {
    const { agent, campaignId } = await loginAsDM('dm_s2');
    const res = await agent.put('/api/dm/settings')
      .set('X-Campaign-Id', String(campaignId))
      .send({ price_multiplier: 1.5 });
    assert.equal(res.status, 200);
    assert.equal(res.body.price_multiplier, '1.5');
  });

  it('rejects invalid price_multiplier (zero)', async () => {
    const { agent, campaignId } = await loginAsDM('dm_s3');
    const res = await agent.put('/api/dm/settings')
      .set('X-Campaign-Id', String(campaignId))
      .send({ price_multiplier: 0 });
    assert.equal(res.status, 400);
  });

  it('rejects invalid price_multiplier (negative)', async () => {
    const { agent, campaignId } = await loginAsDM('dm_s4');
    const res = await agent.put('/api/dm/settings')
      .set('X-Campaign-Id', String(campaignId))
      .send({ price_multiplier: -1 });
    assert.equal(res.status, 400);
  });

  it('player cannot update settings', async () => {
    const { campaignId, joinCode } = await loginAsDM('dm_s5');
    const player = await loginAsPlayer('dm_pl1', joinCode);
    const res = await player.put('/api/dm/settings')
      .set('X-Campaign-Id', String(campaignId))
      .send({ price_multiplier: 99 });
    assert.equal(res.status, 403);
  });

  it('player cannot read settings', async () => {
    const { campaignId, joinCode } = await loginAsDM('dm_s6');
    const player = await loginAsPlayer('dm_pl2', joinCode);
    const res = await player.get('/api/dm/settings').set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 403);
  });
});

describe('Stores (DM management)', () => {
  it('DM can create a store', async () => {
    const { agent, campaignId } = await loginAsDM('dm_st1');
    const res = await agent.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Ye Olde Shoppe', location: 'Market District' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Ye Olde Shoppe');
    assert.equal(res.body.is_open, 1);
  });

  it('player cannot create a store', async () => {
    const { campaignId, joinCode } = await loginAsDM('dm_st2');
    const player = await loginAsPlayer('st_pl1', joinCode);
    const res = await player.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Sneaky Shop' });
    assert.equal(res.status, 403);
  });

  it('DM can toggle store open/closed', async () => {
    const { agent, campaignId } = await loginAsDM('dm_st3');
    const store = await agent.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Toggle Shop' });
    const res = await agent.put(`/api/stores/${store.body.id}`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ is_open: false });
    assert.equal(res.status, 200);
    assert.equal(res.body.is_open, 0);
  });

  it('player cannot see closed stores', async () => {
    const { agent, campaignId, joinCode } = await loginAsDM('dm_st4');
    const player = await loginAsPlayer('st_pl2', joinCode);
    const store = await agent.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Closed Store' });
    await agent.put(`/api/stores/${store.body.id}`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ is_open: false });
    const res = await player.get('/api/stores').set('X-Campaign-Id', String(campaignId));
    const names = res.body.map(s => s.name);
    assert.ok(!names.includes('Closed Store'));
  });

  it('DM can see closed stores', async () => {
    const { agent, campaignId } = await loginAsDM('dm_st5');
    const store = await agent.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Hidden Store' });
    await agent.put(`/api/stores/${store.body.id}`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ is_open: false });
    const res = await agent.get('/api/stores').set('X-Campaign-Id', String(campaignId));
    const names = res.body.map(s => s.name);
    assert.ok(names.includes('Hidden Store'));
  });

  it('rejects store with empty name', async () => {
    const { agent, campaignId } = await loginAsDM('dm_st6');
    const res = await agent.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: '' });
    assert.equal(res.status, 400);
  });
});
