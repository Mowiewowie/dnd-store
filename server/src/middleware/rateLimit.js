import rateLimit from 'express-rate-limit';

// Throttles credential endpoints (login / register) per client IP to slow
// brute-force password guessing and automated account creation.
//
// Disabled under NODE_ENV=test so the existing suite (which registers many
// users from a single loopback IP) stays deterministic. The limiter behaviour
// itself is covered directly in rateLimit.test.js via makeAuthLimiter overrides.
export function makeAuthLimiter(overrides = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,                  // attempts per IP per window (covers a NAT'd party)
    standardHeaders: true,    // emit RateLimit-* headers
    legacyHeaders: false,     // drop deprecated X-RateLimit-* headers
    message: { error: 'Too many attempts. Please try again in a few minutes.' },
    skip: () => process.env.NODE_ENV === 'test',
    ...overrides,
  });
}

export const authLimiter = makeAuthLimiter();
