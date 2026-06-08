import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

async function registerAs(username, role = 'player') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'pass12345', role });
  return agent;
}

describe('POST /api/campaigns', () => {
  it('DM can create a campaign and gets a join code', async () => {
    const dm = await registerAs('dm_camp1', 'dm');
    const res = await dm.post('/api/campaigns').send({ name: 'The Lost Mines' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'The Lost Mines');
    assert.ok(res.body.join_code);
    assert.equal(res.body.join_code.length, 8);
    assert.ok(res.body.dm_username);
  });

  it('join code is uppercase alphanumeric', async () => {
    const dm = await registerAs('dm_camp2', 'dm');
    const res = await dm.post('/api/campaigns').send({ name: 'Test Camp' });
    assert.match(res.body.join_code, /^[A-Z2-9]{8}$/);
  });

  it('player cannot create a campaign', async () => {
    const player = await registerAs('pl_camp1');
    const res = await player.post('/api/campaigns').send({ name: 'Player Camp' });
    assert.equal(res.status, 403);
  });

  it('rejects empty campaign name', async () => {
    const dm = await registerAs('dm_camp3', 'dm');
    const res = await dm.post('/api/campaigns').send({ name: '' });
    assert.equal(res.status, 400);
  });

  it('DM is automatically a member of their own campaign', async () => {
    const dm = await registerAs('dm_camp4', 'dm');
    const camp = await dm.post('/api/campaigns').send({ name: 'Auto-Member Camp' });
    const list = await dm.get('/api/campaigns');
    assert.equal(list.status, 200);
    const found = list.body.find(c => c.id === camp.body.id);
    assert.ok(found);
  });
});

describe('POST /api/campaigns/join', () => {
  it('player can join a campaign with a valid code', async () => {
    const dm = await registerAs('dm_j1', 'dm');
    const camp = await dm.post('/api/campaigns').send({ name: 'Joinable Camp' });
    const joinCode = camp.body.join_code;

    const player = await registerAs('pl_j1');
    const res = await player.post('/api/campaigns/join').send({ code: joinCode });
    assert.equal(res.status, 201);
    assert.equal(res.body.id, camp.body.id);
  });

  it('rejects invalid join code', async () => {
    const player = await registerAs('pl_j2');
    const res = await player.post('/api/campaigns/join').send({ code: 'BADCODE1' });
    assert.equal(res.status, 404);
  });

  it('rejects duplicate join', async () => {
    const dm = await registerAs('dm_j3', 'dm');
    const camp = await dm.post('/api/campaigns').send({ name: 'Join Once' });
    const joinCode = camp.body.join_code;

    const player = await registerAs('pl_j3');
    await player.post('/api/campaigns/join').send({ code: joinCode });
    const res = await player.post('/api/campaigns/join').send({ code: joinCode });
    assert.equal(res.status, 409);
  });

  it('code matching is case-insensitive', async () => {
    const dm = await registerAs('dm_j4', 'dm');
    const camp = await dm.post('/api/campaigns').send({ name: 'Case Camp' });
    const joinCode = camp.body.join_code.toLowerCase();

    const player = await registerAs('pl_j4');
    const res = await player.post('/api/campaigns/join').send({ code: joinCode });
    assert.equal(res.status, 201);
  });
});

describe('GET /api/campaigns', () => {
  it('lists campaigns the user belongs to', async () => {
    const dm = await registerAs('dm_g1', 'dm');
    await dm.post('/api/campaigns').send({ name: 'Camp A' });
    await dm.post('/api/campaigns').send({ name: 'Camp B' });

    const res = await dm.get('/api/campaigns');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
  });

  it('does not list campaigns the user has not joined', async () => {
    const dm = await registerAs('dm_g2', 'dm');
    await dm.post('/api/campaigns').send({ name: 'Private Camp' });

    const player = await registerAs('pl_g2');
    const res = await player.get('/api/campaigns');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 0);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/campaigns');
    assert.equal(res.status, 401);
  });
});

describe('Campaign data isolation', () => {
  it('characters from campaign A are not visible in campaign B', async () => {
    const dm1 = await registerAs('dm_iso1', 'dm');
    const camp1 = await dm1.post('/api/campaigns').send({ name: 'Camp 1' });
    const camp1Id = camp1.body.id;
    const camp1Code = camp1.body.join_code;

    const dm2 = await registerAs('dm_iso2', 'dm');
    const camp2 = await dm2.post('/api/campaigns').send({ name: 'Camp 2' });
    const camp2Id = camp2.body.id;
    const camp2Code = camp2.body.join_code;

    // Player joins both campaigns
    const player = await registerAs('pl_iso1');
    await player.post('/api/campaigns/join').send({ code: camp1Code });
    await player.post('/api/campaigns/join').send({ code: camp2Code });

    // Create character in Camp 1
    await player.post('/api/characters').set('X-Campaign-Id', String(camp1Id)).send({ name: 'HeroA' });

    // Should not appear in Camp 2
    const res = await player.get('/api/characters').set('X-Campaign-Id', String(camp2Id));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 0);
  });

  it('stores from campaign A are not visible in campaign B', async () => {
    const dm1 = await registerAs('dm_iso3', 'dm');
    const camp1 = await dm1.post('/api/campaigns').send({ name: 'StoresCamp 1' });

    const dm2 = await registerAs('dm_iso4', 'dm');
    const camp2 = await dm2.post('/api/campaigns').send({ name: 'StoresCamp 2' });

    await dm1.post('/api/stores')
      .set('X-Campaign-Id', String(camp1.body.id))
      .send({ name: 'Camp1 Shop' });

    const res = await dm2.get('/api/stores').set('X-Campaign-Id', String(camp2.body.id));
    assert.equal(res.status, 200);
    const names = res.body.map(s => s.name);
    assert.ok(!names.includes('Camp1 Shop'));
  });
});
