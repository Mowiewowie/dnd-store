import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { makeAuthLimiter } from '../middleware/rateLimit.js';

// The shared app disables rate limiting under NODE_ENV=test, so we exercise the
// limiter directly against a throwaway app with skip:false and a tiny ceiling.
function appWithLimiter(max) {
  const app = express();
  const limiter = makeAuthLimiter({ max, skip: () => false });
  app.post('/api/auth/login', limiter, (_req, res) => res.json({ ok: true }));
  return app;
}

describe('auth rate limiter', () => {
  it('allows requests up to the limit, then responds 429', async () => {
    const app = appWithLimiter(3);

    for (let i = 0; i < 3; i++) {
      const ok = await request(app).post('/api/auth/login').send({});
      assert.equal(ok.status, 200, `request ${i + 1} should be allowed`);
    }

    const blocked = await request(app).post('/api/auth/login').send({});
    assert.equal(blocked.status, 429);
    assert.match(blocked.body.error, /too many/i);
  });

  it('emits standard RateLimit headers', async () => {
    const app = appWithLimiter(5);
    const res = await request(app).post('/api/auth/login').send({});
    // standardHeaders: true → RateLimit-* present, legacy X-RateLimit-* absent
    assert.ok(res.headers['ratelimit-limit'] ?? res.headers['ratelimit'], 'RateLimit header present');
    assert.equal(res.headers['x-ratelimit-limit'], undefined);
  });

  it('is a no-op under NODE_ENV=test (shared-app safety)', async () => {
    // Default limiter skips in test; many requests over a max of 1 still pass.
    const app = express();
    app.post('/api/auth/login', makeAuthLimiter({ max: 1 }), (_req, res) => res.json({ ok: true }));
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/login').send({});
      assert.equal(res.status, 200);
    }
  });
});
