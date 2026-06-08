import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

async function setupDMAndStore(suffix = '') {
  const dm = request.agent(app);
  await dm.post('/api/auth/register').send({ username: `dm_p${suffix}`, password: 'dmpass123', role: 'dm' });
  const storeRes = await dm.post('/api/stores').send({ name: "Blacksmith's", location: 'Town Square' });
  const storeId = storeRes.body.id;
  const listingRes = await dm.post(`/api/stores/${storeId}/listings`).send({
    item_name: 'Longsword',
    item_description: 'A sturdy blade.',
    custom_price_cp: 1500,
    quantity: 5,
  });
  return { dm, storeId, listingId: listingRes.body.id };
}

async function setupPlayer(username) {
  const player = request.agent(app);
  await player.post('/api/auth/register').send({ username, password: 'playerpass' });
  const charRes = await player.post('/api/characters').send({ name: 'Hero', gold_gp: 50 });
  return { player, characterId: charRes.body.id };
}

describe('POST /api/purchase', () => {
  it('deducts gold and records transaction on success', async () => {
    const { listingId } = await setupDMAndStore('1');
    const { player, characterId } = await setupPlayer('buyer1');

    const res = await player.post('/api/purchase').send({ characterId, listingId, quantity: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.transaction.item_name, 'Longsword');
    assert.equal(res.body.transaction.price_paid_cp, 1500);
    assert.equal(res.body.character.gold_gp, 35);
  });

  it('rejects purchase when character has insufficient gold', async () => {
    const { listingId } = await setupDMAndStore('2');
    const player = request.agent(app);
    await player.post('/api/auth/register').send({ username: 'broke_p', password: 'pass123' });
    const charRes = await player.post('/api/characters').send({ name: 'Pauper', gold_gp: 0 });

    const res = await player.post('/api/purchase').send({
      characterId: charRes.body.id,
      listingId,
      quantity: 1,
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /insufficient/i);
  });

  it('rejects purchase when quantity exceeds stock', async () => {
    const { listingId } = await setupDMAndStore('3');
    const { player, characterId } = await setupPlayer('buyer2');

    const res = await player.post('/api/purchase').send({ characterId, listingId, quantity: 999 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /stock/i);
  });

  it('rejects purchase for non-existent listing', async () => {
    const { player, characterId } = await setupPlayer('buyer3');
    const res = await player.post('/api/purchase').send({ characterId, listingId: 9999, quantity: 1 });
    assert.equal(res.status, 404);
  });

  it("forbids purchasing on behalf of another user's character", async () => {
    const { listingId } = await setupDMAndStore('4');
    const { characterId } = await setupPlayer('owner_char');
    const thief = request.agent(app);
    await thief.post('/api/auth/register').send({ username: 'thief_b', password: 'thief123' });

    const res = await thief.post('/api/purchase').send({ characterId, listingId, quantity: 1 });
    assert.equal(res.status, 403);
  });

  it('requires characterId and listingId', async () => {
    const { player } = await setupPlayer('buyer4');
    const res = await player.post('/api/purchase').send({ quantity: 1 });
    assert.equal(res.status, 400);
  });

  it('applies price multiplier correctly', async () => {
    const dm = request.agent(app);
    await dm.post('/api/auth/register').send({ username: 'dm_mult', password: 'dmpass456', role: 'dm' });
    const storeRes = await dm.post('/api/stores').send({ name: 'Multiplied Shop' });
    const listingRes = await dm.post(`/api/stores/${storeRes.body.id}/listings`).send({
      item_name: 'Arrow',
      srd_default_cp: 100,
      quantity: 10,
    });
    await dm.put('/api/dm/settings').send({ price_multiplier: 2.0 });

    const { player, characterId } = await setupPlayer('mult_buyer');
    const res = await player.post('/api/purchase').send({
      characterId,
      listingId: listingRes.body.id,
      quantity: 1,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.transaction.price_paid_cp, 200);
  });
});
