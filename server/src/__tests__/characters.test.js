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

  it("forbids accessing another user's character transactions", async () => {
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
});
