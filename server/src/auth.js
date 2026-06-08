import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dnd-store-dev-secret-change-in-prod';
const COOKIE_NAME = 'dnd_token';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireDM(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'dm') {
      return res.status(403).json({ error: 'DM access required' });
    }
    next();
  });
}
