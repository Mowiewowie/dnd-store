import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireDM } from '../auth.js';

const router = Router();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateJoinCode() {
  return Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

// List campaigns the current user belongs to
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const campaigns = db.prepare(`
    SELECT c.id, c.name, c.join_code, c.dm_id, c.created_at,
           u.username AS dm_username,
           (SELECT COUNT(*) FROM campaign_members WHERE campaign_id = c.id) AS member_count
    FROM campaigns c
    JOIN campaign_members cm ON c.id = cm.campaign_id
    JOIN users u ON c.dm_id = u.id
    WHERE cm.user_id = ?
    ORDER BY cm.joined_at DESC
  `).all(req.user.id);
  res.json(campaigns);
});

// DM creates a new campaign
router.post('/', requireDM, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Campaign name is required' });
  }

  const db = getDb();

  let joinCode;
  let attempts = 0;
  do {
    joinCode = generateJoinCode();
    if (++attempts > 50) return res.status(500).json({ error: 'Could not generate unique join code' });
  } while (db.prepare('SELECT 1 FROM campaigns WHERE join_code = ?').get(joinCode));

  const result = db.prepare(
    'INSERT INTO campaigns (name, dm_id, join_code) VALUES (?, ?, ?)'
  ).run(name.trim(), req.user.id, joinCode);

  const campaignId = Number(result.lastInsertRowid);
  db.prepare('INSERT INTO campaign_members (campaign_id, user_id) VALUES (?, ?)').run(campaignId, req.user.id);

  const campaign = db.prepare(`
    SELECT c.id, c.name, c.join_code, c.dm_id, c.created_at,
           u.username AS dm_username,
           1 AS member_count
    FROM campaigns c JOIN users u ON c.dm_id = u.id WHERE c.id = ?
  `).get(campaignId);
  res.status(201).json(campaign);
});

// Any user joins a campaign with a code
router.post('/join', requireAuth, (req, res) => {
  const code = (req.body.code || '').toUpperCase().trim();
  if (!code) return res.status(400).json({ error: 'Join code is required' });

  const db = getDb();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE join_code = ?').get(code);
  if (!campaign) return res.status(404).json({ error: 'Invalid join code' });

  const existing = db.prepare(
    'SELECT 1 FROM campaign_members WHERE campaign_id = ? AND user_id = ?'
  ).get(campaign.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Already a member of this campaign' });

  db.prepare('INSERT INTO campaign_members (campaign_id, user_id) VALUES (?, ?)').run(campaign.id, req.user.id);

  const result = db.prepare(`
    SELECT c.id, c.name, c.join_code, c.dm_id, c.created_at,
           u.username AS dm_username,
           (SELECT COUNT(*) FROM campaign_members WHERE campaign_id = c.id) AS member_count
    FROM campaigns c JOIN users u ON c.dm_id = u.id WHERE c.id = ?
  `).get(campaign.id);
  res.status(201).json(result);
});

export default router;
