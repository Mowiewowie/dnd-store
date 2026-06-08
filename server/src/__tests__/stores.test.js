import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

async function makeDMWithCampaign() {
  const dm = request.agent(app);
  await dm.post('/api/auth/register').send({ username: 'dm_store', password: 'dmpass123', role: 'dm' });
  const camp = await dm.post('/api/campaigns').send({ name: 'StoreCamp' });
  return { dm, campaignId: camp.body.id };
}

describe('PATCH /api/stores/:id/temperament', () => {
  it('saves and returns price_bias', async () => {
    const { dm, campaignId } = await makeDMWithCampaign();
    const storeRes = await dm.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Test Shop' });
    const storeId = storeRes.body.id;

    const res = await dm.patch(`/api/stores/${storeId}/temperament`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ bias: 1.5 });
    assert.equal(res.status, 200);
    assert.equal(res.body.price_bias, 1.5);
  });

  it('persists temperament so GET store reflects it', async () => {
    const { dm, campaignId } = await makeDMWithCampaign();
    const storeRes = await dm.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Greedy Shop' });
    const storeId = storeRes.body.id;

    await dm.patch(`/api/stores/${storeId}/temperament`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ bias: 2.0 });

    const getRes = await dm.get(`/api/stores/${storeId}`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(getRes.body.price_bias, 2.0);
  });

  it('new stores default to bias 0', async () => {
    const { dm, campaignId } = await makeDMWithCampaign();
    const storeRes = await dm.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Fresh Shop' });
    const storeId = storeRes.body.id;
    const res = await dm.get(`/api/stores/${storeId}`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(res.body.price_bias, 0);
  });

  it('rejects bias outside -2 to 2', async () => {
    const { dm, campaignId } = await makeDMWithCampaign();
    const storeRes = await dm.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Shop' });

    const res = await dm.patch(`/api/stores/${storeRes.body.id}/temperament`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ bias: 5 });
    assert.equal(res.status, 400);
  });

  it('requires DM role', async () => {
    const { dm, campaignId } = await makeDMWithCampaign();
    const storeRes = await dm.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Shop' });
    const storeId = storeRes.body.id;

    const player = request.agent(app);
    await player.post('/api/auth/register').send({ username: 'ptemp', password: 'pass123', role: 'player' });
    await player.post('/api/campaigns/join').send({ code: (await dm.get('/api/campaigns').set('X-Campaign-Id', String(campaignId))).body[0]?.join_code });

    const res = await player.patch(`/api/stores/${storeId}/temperament`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ bias: 1 });
    assert.equal(res.status, 403);
  });
});
