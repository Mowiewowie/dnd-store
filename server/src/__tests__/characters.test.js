import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

async function makeDMWithCampaign(suffix = '') {
  const dm = request.agent(app);
  await dm.post('/api/auth/register').send({ username: `dm_ch${suffix}`, password: 'dmpass123', role: 'dm' });
  const camp = await dm.post('/api/campaigns').send({ name: 'TestCamp' });
  return { dm, campaignId: camp.body.id, joinCode: camp.body.join_code };
}

async function makePlayerInCampaign(suffix = '', joinCode) {
  const player = request.agent(app);
  await player.post('/api/auth/register').send({ username: `pl_ch${suffix}`, password: 'pass1234' });
  await player.post('/api/campaigns/join').send({ code: joinCode });
  return player;
}

describe('GET /api/characters', () => {
  it('returns empty array for new user in campaign', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('1');
    const player = await makePlayerInCampaign('1', joinCode);
    const res = await player.get('/api/characters').set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/characters');
    assert.equal(res.status, 401);
  });

  it('returns 400 when campaign not selected', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('2');
    const player = await makePlayerInCampaign('2', joinCode);
    const res = await player.get('/api/characters');
    assert.equal(res.status, 400);
  });
});

describe('POST /api/characters', () => {
  it('creates a character with defaults', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('3');
    const player = await makePlayerInCampaign('3', joinCode);
    const res = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Thorin', class: 'Fighter' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Thorin');
    assert.equal(res.body.gold_gp, 50);
  });

  it('allows custom starting gold', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('4');
    const player = await makePlayerInCampaign('4', joinCode);
    const res = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Richy', gold_gp: 200 });
    assert.equal(res.status, 201);
    assert.equal(res.body.gold_gp, 200);
  });

  it('rejects duplicate character name for same user in same campaign', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('5');
    const player = await makePlayerInCampaign('5', joinCode);
    await player.post('/api/characters').set('X-Campaign-Id', String(campaignId)).send({ name: 'Elf' });
    const res = await player.post('/api/characters').set('X-Campaign-Id', String(campaignId)).send({ name: 'Elf' });
    assert.equal(res.status, 409);
  });

  it('allows same character name for different users in same campaign', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('6');
    const player1 = await makePlayerInCampaign('6a', joinCode);
    const player2 = await makePlayerInCampaign('6b', joinCode);
    await player1.post('/api/characters').set('X-Campaign-Id', String(campaignId)).send({ name: 'SameName' });
    const res = await player2.post('/api/characters').set('X-Campaign-Id', String(campaignId)).send({ name: 'SameName' });
    assert.equal(res.status, 201);
  });

  it('rejects empty character name', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('7');
    const player = await makePlayerInCampaign('7', joinCode);
    const res = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: '' });
    assert.equal(res.status, 400);
  });
});

describe('GET /api/characters/:id/transactions', () => {
  it('returns empty array for character with no purchases', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('8');
    const player = await makePlayerInCampaign('8', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Newbie' });
    const res = await player.get(`/api/characters/${charRes.body.id}/transactions`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it("forbids accessing another player's character transactions", async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('9');
    const player1 = await makePlayerInCampaign('9a', joinCode);
    const player2 = await makePlayerInCampaign('9b', joinCode);
    const charRes = await player1.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Secret' });
    const res = await player2.get(`/api/characters/${charRes.body.id}/transactions`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 403);
  });

  it('DM can access any character transactions in campaign', async () => {
    const { dm, campaignId, joinCode } = await makeDMWithCampaign('10');
    const player = await makePlayerInCampaign('10', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Ranger' });
    const res = await dm.get(`/api/characters/${charRes.body.id}/transactions`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});

describe('GET /api/characters/campaign', () => {
  it('DM gets all campaign characters with player username', async () => {
    const { dm, campaignId, joinCode } = await makeDMWithCampaign('11');
    const player = await makePlayerInCampaign('11', joinCode);
    await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Paladin' });
    const res = await dm.get('/api/characters/campaign').set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].name, 'Paladin');
    assert.ok(res.body[0].username, 'should include player username');
  });

  it('player gets 403', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('12');
    const player = await makePlayerInCampaign('12', joinCode);
    const res = await player.get('/api/characters/campaign').set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 403);
  });
});

describe('PATCH /api/characters/:id/money', () => {
  it('adds gold and logs an adjustment transaction', async () => {
    const { dm, campaignId, joinCode } = await makeDMWithCampaign('13');
    const player = await makePlayerInCampaign('13', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Merchant', gold_gp: 10 });
    const charId = charRes.body.id;

    const res = await dm.patch(`/api/characters/${charId}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: 500, notes: 'Quest reward' });
    assert.equal(res.status, 200);
    // 10 gp = 1000 cp + 500 cp = 1500 cp = 15 gp
    assert.equal(res.body.gold_gp, 15);

    const tx = await dm.get(`/api/characters/${charId}/transactions`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(tx.body[0].type, 'dm_adjustment');
    assert.equal(tx.body[0].notes, 'Quest reward');
  });

  it('subtracts gold correctly', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('14');
    const player = await makePlayerInCampaign('14', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Gambler', gold_gp: 10 });

    const res = await player.patch(`/api/characters/${charRes.body.id}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: -500, notes: 'Lost at dice' });
    assert.equal(res.status, 200);
    assert.equal(res.body.gold_gp, 5);
  });

  it('rejects adjustment that would go below zero', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('15');
    const player = await makePlayerInCampaign('15', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Broke', gold_gp: 1 });

    const res = await player.patch(`/api/characters/${charRes.body.id}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: -999999 });
    assert.equal(res.status, 400);
  });

  it('player cannot adjust another player\'s character', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('16');
    const player1 = await makePlayerInCampaign('16a', joinCode);
    const player2 = await makePlayerInCampaign('16b', joinCode);
    const charRes = await player1.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Victim' });

    const res = await player2.patch(`/api/characters/${charRes.body.id}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: 100 });
    assert.equal(res.status, 403);
  });
});

describe('PATCH /api/characters/:id/money — edge cases', () => {
  it('player adjustment logs type=adjustment (not dm_adjustment)', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('21');
    const player = await makePlayerInCampaign('21', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'SelfAdjuster', gold_gp: 10 });
    const charId = charRes.body.id;

    await player.patch(`/api/characters/${charId}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: 100, notes: 'Found coin' });

    const txRes = await player.get(`/api/characters/${charId}/transactions`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(txRes.body[0].type, 'adjustment');
  });

  it('rejects delta_cp of zero', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('22');
    const player = await makePlayerInCampaign('22', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'ZeroGold', gold_gp: 5 });

    const res = await player.patch(`/api/characters/${charRes.body.id}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: 0 });
    assert.equal(res.status, 400);
  });

  it('DM adjustment logs type=dm_adjustment', async () => {
    const { dm, campaignId, joinCode } = await makeDMWithCampaign('23');
    const player = await makePlayerInCampaign('23', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'DMAdjust', gold_gp: 10 });
    const charId = charRes.body.id;

    await dm.patch(`/api/characters/${charId}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: 500, notes: 'Loot' });

    const txRes = await dm.get(`/api/characters/${charId}/transactions`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(txRes.body[0].type, 'dm_adjustment');
  });
});

describe('DELETE /api/characters/:id', () => {
  it('player can delete their own character', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('30');
    const player = await makePlayerInCampaign('30', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Doomed Hero' });
    const charId = charRes.body.id;

    const del = await player.delete(`/api/characters/${charId}`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(del.status, 200);
    assert.equal(del.body.ok, true);

    const list = await player.get('/api/characters').set('X-Campaign-Id', String(campaignId));
    assert.equal(list.body.find(c => c.id === charId), undefined);
  });

  it('deleting a character with transactions succeeds (no FK violation)', async () => {
    const { dm, campaignId, joinCode } = await makeDMWithCampaign('31');
    const player = await makePlayerInCampaign('31', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Veteran', gold_gp: 100 });
    const charId = charRes.body.id;

    // Add a transaction (gold adjustment creates a transaction record)
    await dm.patch(`/api/characters/${charId}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: 100, notes: 'Test loot' });

    const del = await player.delete(`/api/characters/${charId}`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(del.status, 200);
  });

  it('player cannot delete another player\'s character', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('32');
    const player1 = await makePlayerInCampaign('32a', joinCode);
    const player2 = await makePlayerInCampaign('32b', joinCode);
    const charRes = await player1.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Protected' });

    const res = await player2.delete(`/api/characters/${charRes.body.id}`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 403);
  });

  it('returns 404 for a non-existent character', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('33');
    const player = await makePlayerInCampaign('33', joinCode);
    const res = await player.delete('/api/characters/99999')
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 404);
  });
});

describe('Character inventory endpoints', () => {
  it('GET /inventory returns empty array initially', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('17');
    const player = await makePlayerInCampaign('17', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'EmptyBag' });

    const res = await player.get(`/api/characters/${charRes.body.id}/inventory`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('DM can add item to inventory', async () => {
    const { dm, campaignId, joinCode } = await makeDMWithCampaign('18');
    const player = await makePlayerInCampaign('18', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Lucky' });

    const res = await dm.post(`/api/characters/${charRes.body.id}/inventory`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ item_name: 'Dragon Scale', item_description: 'Rare trophy', base_value_cp: 5000 });
    assert.equal(res.status, 201);
    assert.equal(res.body.item_name, 'Dragon Scale');
    assert.equal(res.body.base_value_cp, 5000);
  });

  it('player cannot add items via DM endpoint', async () => {
    const { campaignId, joinCode } = await makeDMWithCampaign('19');
    const player = await makePlayerInCampaign('19', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Cheater' });

    const res = await player.post(`/api/characters/${charRes.body.id}/inventory`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ item_name: 'Self-gifted Sword', base_value_cp: 1000 });
    assert.equal(res.status, 403);
  });

  it('DELETE removes item from inventory', async () => {
    const { dm, campaignId, joinCode } = await makeDMWithCampaign('20');
    const player = await makePlayerInCampaign('20', joinCode);
    const charRes = await player.post('/api/characters')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Dropper' });
    const charId = charRes.body.id;

    const addRes = await dm.post(`/api/characters/${charId}/inventory`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ item_name: 'Old Dagger', base_value_cp: 200 });
    const itemId = addRes.body.id;

    const del = await dm.delete(`/api/characters/${charId}/inventory/${itemId}`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(del.status, 200);

    const inv = await player.get(`/api/characters/${charId}/inventory`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(inv.body.length, 0);
  });
});
