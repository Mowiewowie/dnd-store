import jwt from 'jsonwebtoken';
import { getDb } from './db.js';

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
    secure: process.env.NODE_ENV === 'production',
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

// Must be used after requireAuth or requireDM (requires req.user to be set)
export function requireCampaign(req, res, next) {
  const campaignId = parseInt(req.headers['x-campaign-id']);
  if (!campaignId) return res.status(400).json({ error: 'Campaign not selected' });

  const db = getDb();
  const member = db.prepare(
    'SELECT 1 FROM campaign_members WHERE campaign_id = ? AND user_id = ?'
  ).get(campaignId, req.user.id);

  if (!member) return res.status(403).json({ error: 'Not a member of this campaign' });

  req.campaignId = campaignId;
  next();
}

// True when the current user owns (is the DM of) the selected campaign.
// Must be used after requireCampaign so req.campaignId / req.user are set.
export function isCampaignDM(req) {
  if (!req.campaignId || !req.user) return false;
  const db = getDb();
  const campaign = db.prepare('SELECT dm_id FROM campaigns WHERE id = ?').get(req.campaignId);
  return !!campaign && campaign.dm_id === req.user.id;
}

// Authorizes DM-only actions against campaign *ownership*, not the global
// 'dm' role. Prevents any role:'dm' member from controlling a campaign they
// merely joined — only the campaign's own DM passes.
export function requireCampaignDM(req, res, next) {
  requireAuth(req, res, () => {
    requireCampaign(req, res, () => {
      if (!isCampaignDM(req)) {
        return res.status(403).json({ error: 'DM access required' });
      }
      next();
    });
  });
}
