import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

async function setupSellScenario(suffix = '') {
  const dm = request.agent(app);
  await dm.post('/api/auth/register').send({ username: `dm_s${suffix}`, password: 'dmpass123', role: 'dm' });
  const camp = await dm.post('/api/campaigns').send({ name: 'SellCamp' });
  const campaignId = camp.body.id;
  const joinCode = camp.body.join_code;

  const storeRes = await dm.post('/api/stores')
    .set('X-Campaign-Id', String(campaignId))
    .send({ name: 'Pawn Shop' });
  const storeId = storeRes.body.id;

  const player = request.agent(app);
  await player.post('/api/auth/register').send({ username: `pl_s${suffix}`, password: 'pass123' });
  await player.post('/api/campaigns/join').send({ code: joinCode });
  const charRes = await player.post('/api/characters')
    .set('X-Campaign-Id', String(campaignId))
    .send({ name: 'Seller', gold_gp: 50 });
  const characterId = charRes.body.id;

  // DM adds item to character's inventory with a known base value
  const itemRes = await dm.post(`/api/characters/${characterId}/inventory`)
    .set('X-Campaign-Id', String(campaignId))
    .send({ item_name: 'Old Cloak', base_value_cp: 1000, quantity: 1 });
  const inventoryItemId = itemRes.body.id;

  return { dm, player, campaignId, storeId, characterId, inventoryItemId };
}

describe('POST /api/stores/:id/sell', () => {
  it('adds gold to character and removes item from inventory', async () => {
    const { player, campaignId, storeId, characterId, inventoryItemId } = await setupSellScenario('1');

    const res = await player.post(`/api/stores/${storeId}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, inventoryItemId, quantity: 1 });

    assert.equal(res.status, 200);
    assert.ok(res.body.gold_received_cp > 0, 'should receive some gold');
    // 50 gp = 5000 cp + gold received
    assert.ok(res.body.character.gold_gp * 100 >= 5000, 'gold should increase');

    const inv = await player.get(`/api/characters/${characterId}/inventory`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(inv.body.length, 0, 'item should be removed from inventory');
  });

  it('records a sale transaction in history', async () => {
    const { player, dm, campaignId, storeId, characterId, inventoryItemId } = await setupSellScenario('2');

    await player.post(`/api/stores/${storeId}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, inventoryItemId, quantity: 1 });

    const tx = await dm.get(`/api/characters/${characterId}/transactions`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(tx.body[0].type, 'sale');
    assert.equal(tx.body[0].item_name, 'Old Cloak');
  });

  it('generous store pays more than cutthroat store', async () => {
    // Setup two stores with different temperaments
    const dm = request.agent(app);
    await dm.post('/api/auth/register').send({ username: 'dm_s3', password: 'pass123', role: 'dm' });
    const camp = await dm.post('/api/campaigns').send({ name: 'Camp3' });
    const campaignId = camp.body.id;
    const joinCode = camp.body.join_code;

    const genRes = await dm.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Generous Shop' });
    const cutRes = await dm.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Cutthroat Shop' });
    await dm.patch(`/api/stores/${genRes.body.id}/temperament`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ bias: -2 });
    await dm.patch(`/api/stores/${cutRes.body.id}/temperament`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ bias: 2 });

    const player = request.agent(app);
    await player.post('/api/auth/register').send({ username: 'pl_s3', password: 'pass123' });
    await player.post('/api/campaigns/join').send({ code: joinCode });
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'SellerC', gold_gp: 100 });
    const characterId = charRes.body.id;

    // Grant two identical items with the same base value
    const item1 = await dm.post(`/api/characters/${characterId}/inventory`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ item_name: 'Gem', base_value_cp: 10000 });
    const item2 = await dm.post(`/api/characters/${characterId}/inventory`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ item_name: 'Gem', base_value_cp: 10000 });

    const genSell = await player.post(`/api/stores/${genRes.body.id}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, inventoryItemId: item1.body.id, quantity: 1 });
    const cutSell = await player.post(`/api/stores/${cutRes.body.id}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, inventoryItemId: item2.body.id, quantity: 1 });

    assert.ok(
      genSell.body.gold_received_cp > cutSell.body.gold_received_cp,
      `Generous (${genSell.body.gold_received_cp} cp) should pay more than cutthroat (${cutSell.body.gold_received_cp} cp)`
    );
    // Generous: 10000 × 1.0 = 10000; Cutthroat: 10000 × 0.5 = 5000
    assert.equal(genSell.body.gold_received_cp, 10000);
    assert.equal(cutSell.body.gold_received_cp, 5000);
  });

  it('impartial store pays 75% of base value', async () => {
    const { player, campaignId, storeId, characterId, inventoryItemId } = await setupSellScenario('4');
    // Store has default bias=0 → multiplier 0.75, base_value_cp=1000 → 750 cp
    const res = await player.post(`/api/stores/${storeId}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, inventoryItemId, quantity: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.gold_received_cp, 750);
  });

  it('returns 404 for item not in inventory', async () => {
    const { player, campaignId, storeId, characterId } = await setupSellScenario('5');
    const res = await player.post(`/api/stores/${storeId}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, inventoryItemId: 99999, quantity: 1 });
    assert.equal(res.status, 404);
  });

  it("forbids selling on behalf of another player's character", async () => {
    const { player, dm, campaignId, storeId, characterId, inventoryItemId } = await setupSellScenario('6');

    const thief = request.agent(app);
    await thief.post('/api/auth/register').send({ username: 'thief_s6', password: 'pass123' });
    await thief.post('/api/campaigns/join').send({
      code: (await dm.get('/api/campaigns').set('X-Campaign-Id', String(campaignId))).body[0]?.join_code,
    });

    const res = await thief.post(`/api/stores/${storeId}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, inventoryItemId, quantity: 1 });
    assert.equal(res.status, 403);
  });

  it('buying an item adds it to inventory', async () => {
    const { player, dm, campaignId, storeId, characterId } = await setupSellScenario('7');

    // DM adds listing
    const listingRes = await dm.post(`/api/stores/${storeId}/listings`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ item_name: 'Iron Shield', custom_price_cp: 500, quantity: 3 });

    await player.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, listingId: listingRes.body.id, quantity: 1 });

    const inv = await player.get(`/api/characters/${characterId}/inventory`)
      .set('X-Campaign-Id', String(campaignId));
    // Should have the DM-granted item + newly bought item
    const bought = inv.body.find(i => i.item_name === 'Iron Shield');
    assert.ok(bought, 'bought item should appear in inventory');
    assert.equal(bought.quantity, 1);
    assert.equal(bought.base_value_cp, 500);
  });

  it('buying same item twice stacks quantity in inventory', async () => {
    const { player, dm, campaignId, storeId, characterId } = await setupSellScenario('8');

    const listingRes = await dm.post(`/api/stores/${storeId}/listings`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ item_name: 'Health Potion', custom_price_cp: 50, quantity: 10 });

    await player.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, listingId: listingRes.body.id, quantity: 1 });
    await player.post('/api/purchase')
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, listingId: listingRes.body.id, quantity: 1 });

    const inv = await player.get(`/api/characters/${characterId}/inventory`)
      .set('X-Campaign-Id', String(campaignId));
    const potions = inv.body.filter(i => i.item_name === 'Health Potion');
    assert.equal(potions.length, 1, 'should be one stacked entry');
    assert.equal(potions[0].quantity, 2, 'quantity should stack to 2');
  });

  it('returns 400 when selling more than available quantity', async () => {
    const { player, campaignId, storeId, characterId, inventoryItemId } = await setupSellScenario('9');

    const res = await player.post(`/api/stores/${storeId}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, inventoryItemId, quantity: 999 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /not enough/i);
  });

  it('returns 400 when selling to a closed store', async () => {
    const { dm, player, campaignId, storeId, characterId, inventoryItemId } = await setupSellScenario('10');

    await dm.put(`/api/stores/${storeId}`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Closed Shop', is_open: false });

    const res = await player.post(`/api/stores/${storeId}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ characterId, inventoryItemId, quantity: 1 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /closed/i);
  });

  it('requires characterId and inventoryItemId', async () => {
    const { player, campaignId, storeId } = await setupSellScenario('11');
    const res = await player.post(`/api/stores/${storeId}/sell`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ quantity: 1 });
    assert.equal(res.status, 400);
  });
});
