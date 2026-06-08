import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { resetDb } from './setup.js';

beforeEach(() => resetDb());

describe('POST /api/auth/register', () => {
  it('creates a player account and sets a cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'thorin',
      password: 'password123',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.username, 'thorin');
    assert.equal(res.body.role, 'player');
    assert.ok(res.headers['set-cookie']);
  });

  it('creates a dm account', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'dungeonmaster',
      password: 'password123',
      role: 'dm',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.role, 'dm');
  });

  it('rejects duplicate username', async () => {
    await request(app).post('/api/auth/register').send({ username: 'gandalf', password: 'pass123' });
    const res = await request(app).post('/api/auth/register').send({ username: 'gandalf', password: 'pass456' });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /taken/i);
  });

  it('rejects missing username', async () => {
    const res = await request(app).post('/api/auth/register').send({ password: 'pass123' });
    assert.equal(res.status, 400);
  });

  it('rejects missing password', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'aragorn' });
    assert.equal(res.status, 400);
  });

  it('rejects short username', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'ab', password: 'pass123' });
    assert.equal(res.status, 400);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'legolas', password: '123' });
    assert.equal(res.status, 400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({ username: 'frodo', password: 'theone123' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'frodo', password: 'theone123' });
    assert.equal(res.status, 200);
    assert.equal(res.body.username, 'frodo');
    assert.ok(res.headers['set-cookie']);
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'frodo', password: 'wrongpass' });
    assert.equal(res.status, 401);
  });

  it('rejects unknown username', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'sauron', password: 'darkone' });
    assert.equal(res.status, 401);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'frodo' });
    assert.equal(res.status, 400);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the auth cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });
});

describe('GET /api/auth/me', () => {
  it('returns current user when authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ username: 'bilbo', password: 'hobbit123' });
    const res = await agent.get('/api/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.username, 'bilbo');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });
});
