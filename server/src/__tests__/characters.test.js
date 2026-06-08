import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

async function registerAndLogin(username = 'player1', role = 'player') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'pass1234', role });
  return agent;
}

describe('GET /api/characters', () => {
  it('returns empty array for new user', async () => {
    const agent = await registerAndLogin('gc_p1');
    const res = await agent.get('/api/characters');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/characters');
    assert.equal(res.status, 401);
  });
});

describe('POST /api/characters', () => {
  it('creates a character with defaults', async () => {
    const agent = await registerAndLogin('cc_p2');
    const res = await agent.post('/api/characters').send({ name: 'Thorin', class: 'Fighter' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Thorin');
    assert.equal(res.body.class, 'Fighter');
    assert.equal(res.body.gold_gp, 50);
    assert.equal(res.body.gold_sp, 0);
    assert.equal(res.body.gold_cp, 0);
  });

  it('allows custom starting gold', async () => {
    const agent = await registerAndLogin('cc_p3');
    const res = await agent.post('/api/characters').send({ name: 'Richy', gold_gp: 200 });
    assert.equal(res.status, 201);
    assert.equal(res.body.gold_gp, 200);
  });

  it('rejects duplicate character name for same user', async () => {
    const agent = await registerAndLogin('cc_p4');
    await agent.post('/api/characters').send({ name: 'Elf' });
    const res = await agent.post('/api/characters').send({ name: 'Elf' });
    assert.equal(res.status, 409);
  });

  it('allows same character name for different users', async () => {
    const agent1 = await registerAndLogin('cc_userA');
    const agent2 = await registerAndLogin('cc_userB');
    await agent1.post('/api/characters').send({ name: 'SameName' });
    const res = await agent2.post('/api/characters').send({ name: 'SameName' });
    assert.equal(res.status, 201);
  });

  it('rejects empty character name', async () => {
    const agent = await registerAndLogin('cc_p5');
    const res = await agent.post('/api/characters').send({ name: '' });
    assert.equal(res.status, 400);
  });
});

describe('GET /api/characters/:id/transactions', () => {
  it('returns empty array for character with no purchases', async () => {
    const agent = await registerAndLogin('tx_p6');
    const charRes = await agent.post('/api/characters').send({ name: 'Newbie' });
    const res = await agent.get(`/api/characters/${charRes.body.id}/transactions`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it("forbids accessing another user's character transactions", async () => {
    const agent1 = await registerAndLogin('tx_user1');
    const agent2 = await registerAndLogin('tx_user2');
    const charRes = await agent1.post('/api/characters').send({ name: 'Secret' });
    const res = await agent2.get(`/api/characters/${charRes.body.id}/transactions`);
    assert.equal(res.status, 403);
  });
});
