import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';
import { setAuthCookie } from '../auth.js';

beforeEach(() => resetDb());

// Owner DM creates a campaign; an *intruder* DM (global role:'dm') then joins
// that same campaign by code. The intruder is a member but NOT the campaign's
// owner (campaigns.dm_id), so must be denied every DM action.
async function setupCampaignWithIntruder() {
  const owner = request.agent(app);
  await owner.post('/api/auth/register').send({ username: 'owner_dm', password: 'ownerpass1', role: 'dm' });
  const camp = await owner.post('/api/campaigns').send({ name: 'OwnersCamp' });
  const campaignId = camp.body.id;
  const joinCode = camp.body.join_code;

  const intruder = request.agent(app);
  await intruder.post('/api/auth/register').send({ username: 'intruder_dm', password: 'intrudpass1', role: 'dm' });
  await intruder.post('/api/campaigns/join').send({ code: joinCode });

  // A player with a character the intruder will try to tamper with.
  const player = request.agent(app);
  await player.post('/api/auth/register').send({ username: 'victim_pl', password: 'playerpass1' });
  await player.post('/api/campaigns/join').send({ code: joinCode });
  const char = await player.post('/api/characters')
    .set('X-Campaign-Id', String(campaignId))
    .send({ name: 'Victim', gold_gp: 100 });

  return { owner, intruder, player, campaignId, characterId: char.body.id };
}

describe('Per-campaign DM authorization — intruder DM (role:dm but not owner)', () => {
  it('cannot create a store in a campaign it merely joined', async () => {
    const { intruder, campaignId } = await setupCampaignWithIntruder();
    const res = await intruder.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Hostile Takeover Shop' });
    assert.equal(res.status, 403);
  });

  it('cannot change campaign price-multiplier settings', async () => {
    const { intruder, campaignId } = await setupCampaignWithIntruder();
    const res = await intruder.put('/api/dm/settings')
      .set('X-Campaign-Id', String(campaignId))
      .send({ price_multiplier: 99 });
    assert.equal(res.status, 403);
  });

  it('cannot read the DM-only campaign character roster', async () => {
    const { intruder, campaignId } = await setupCampaignWithIntruder();
    const res = await intruder.get('/api/characters/campaign')
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 403);
  });

  it("cannot adjust another player's character gold", async () => {
    const { intruder, campaignId, characterId } = await setupCampaignWithIntruder();
    const res = await intruder.patch(`/api/characters/${characterId}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: 1000000 });
    assert.equal(res.status, 403);
  });

  it("cannot grant items into another player's inventory", async () => {
    const { intruder, campaignId, characterId } = await setupCampaignWithIntruder();
    const res = await intruder.post(`/api/characters/${characterId}/inventory`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ item_name: 'Smuggled Blade', base_value_cp: 5000 });
    assert.equal(res.status, 403);
  });
});

describe('Per-campaign DM authorization — owner DM retains full control', () => {
  it('owner can create a store', async () => {
    const { owner, campaignId } = await setupCampaignWithIntruder();
    const res = await owner.post('/api/stores')
      .set('X-Campaign-Id', String(campaignId))
      .send({ name: 'Legit Shop' });
    assert.equal(res.status, 201);
  });

  it("owner can adjust a player's gold (logged as dm_adjustment)", async () => {
    const { owner, campaignId, characterId } = await setupCampaignWithIntruder();
    const res = await owner.patch(`/api/characters/${characterId}/money`)
      .set('X-Campaign-Id', String(campaignId))
      .send({ delta_cp: 500, notes: 'Quest reward' });
    assert.equal(res.status, 200);

    const tx = await owner.get(`/api/characters/${characterId}/transactions`)
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(tx.body[0].type, 'dm_adjustment');
  });

  it('owner can read the campaign character roster', async () => {
    const { owner, campaignId } = await setupCampaignWithIntruder();
    const res = await owner.get('/api/characters/campaign')
      .set('X-Campaign-Id', String(campaignId));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});

describe('Auth cookie hardening', () => {
  // Capture the options object passed to res.cookie() without a live HTTPS server.
  function capture() {
    let captured;
    const res = { cookie: (_name, _val, opts) => { captured = opts; } };
    setAuthCookie(res, 'token123');
    return captured;
  }

  it('is HttpOnly and SameSite=Lax', () => {
    const opts = capture();
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, 'lax');
  });

  it('sets Secure only in production', () => {
    const original = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.equal(capture().secure, true);
      process.env.NODE_ENV = 'test';
      assert.equal(capture().secure, false);
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});
