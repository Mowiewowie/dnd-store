import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

async function makeDMWithCampaignAndStore(suffix = '') {
  const dm = request.agent(app);
  await dm.post('/api/auth/register').send({ username: `dm_p${suffix}`, password: 'dmpass123', role: 'dm' });
  const camp = await dm.post('/api/campaigns').send({ name: 'PurchaseCamp' });
  const campaignId = camp.body.id;
  const joinCode = camp.body.join_code;

  const storeRes = await dm.post('/api/stores')
    .set('X-Campaign-Id', String(campaignId))
    .send({ name: "Blacksmith's", location: 'Town Square' });
  const storeId = storeRes.body.id;
  const listingRes = await dm.post(`/api/stores/${storeId}/listings`)
    .set('X-Campaign-Id', String(campaignId))
    .send({ item_name: 'Longsword', item_description: 'A sturdy blade.', custom_price_cp: 1500, quantity: 5 });

  return { dm, campaignId, joinCode, storeId, listingId: listingRes.body.id };
}

async function makePlayerInCampaign(suffix = '', joinCode, campaignId) {
  const player = request.agent(app);
  await player.post('/api/auth/register').send({ username: `pl_p${suffix}`, password: 'playerpass' });
  await player.post('/api/campaigns/join').send({ code: joinCode });
  const charRes = await player.post('/api/characters')
    .set('X-Campaign-Id', String(campaignId))
    .send({ name: 'Hero', gold_gp: 50 });
  return { player, characterId: charRes.body.id };
}

describe('POST /api/purchase', () => {
  it('deducts gold and records transaction on success', async () => {
    const { campaignId, joinCode, listingId } = await makeDMWithCampaignAndStore('1');
    const { player, characterId } = await makePlayerInCampaign('1', joinCode, campaignId);
    const res = await player.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, listingId, quantity: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.transaction.item_name, 'Longsword');
    assert.equal(res.body.transaction.price_paid_cp, 1500);
    assert.equal(res.body.character.gold_gp, 35);
  });

  it('rejects purchase when character has insufficient gold', async () => {
    const { campaignId, joinCode, listingId } = await makeDMWithCampaignAndStore('2');
    const player = request.agent(app);
    await player.post('/api/auth/register').send({ username: 'broke_p', password: 'pass123' });
    await player.post('/api/campaigns/join').send({ code: joinCode });
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Pauper', gold_gp: 0 });
    const res = await player.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId: charRes.body.id, listingId, quantity: 1 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /insufficient/i);
  });

  it('rejects purchase when quantity exceeds stock', async () => {
    const { campaignId, joinCode, listingId } = await makeDMWithCampaignAndStore('3');
    const { player, characterId } = await makePlayerInCampaign('3', joinCode, campaignId);
    const res = await player.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, listingId, quantity: 999 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /stock/i);
  });

  it('rejects purchase for non-existent listing', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaignAndStore('4');
    const { player, characterId } = await makePlayerInCampaign('4', joinCode, campaignId);
    const res = await player.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, listingId: 9999, quantity: 1 });
    assert.equal(res.status, 404);
  });

  it("forbids purchasing on behalf of another user's character", async () => {
    const { campaignId, joinCode, listingId } = await makeDMWithCampaignAndStore('5');
    const { characterId } = await makePlayerInCampaign('5a', joinCode, campaignId);
    const thief = request.agent(app);
    await thief.post('/api/auth/register').send({ username: 'thief_b', password: 'thief123' });
    await thief.post('/api/campaigns/join').send({ code: joinCode });
    const res = await thief.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, listingId, quantity: 1 });
    assert.equal(res.status, 403);
  });

  it('requires characterId and listingId', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaignAndStore('6');
    const { player } = await makePlayerInCampaign('6', joinCode, campaignId);
    const res = await player.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ quantity: 1 });
    assert.equal(res.status, 400);
  });

  it('applies price multiplier correctly', async () => {
    const dm = request.agent(app);
    await dm.post('/api/auth/register').send({ username: 'dm_mult', password: 'dmpass456', role: 'dm' });
    const camp = await dm.post('/api/campaigns').send({ name: 'MultCamp' });
    const campaignId = camp.body.id;
    const joinCode = camp.body.join_code;

    const storeRes = await dm.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Multiplied Shop' });
    const listingRes = await dm.post(`/api/stores/${storeRes.body.id}/listings`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ item_name: 'Arrow', srd_default_cp: 100, quantity: 10 });
    await dm.put('/api/dm/settings')
      .set('X-Campaign-Id', String(campaignId))
      .send({ price_multiplier: 2.0 });

    const { player, characterId } = await makePlayerInCampaign('mult', joinCode, campaignId);
    const res = await player.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, listingId: listingRes.body.id, quantity: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.transaction.price_paid_cp, 200);
  });
});
