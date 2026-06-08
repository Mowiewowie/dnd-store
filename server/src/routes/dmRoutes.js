import { Router } from 'express';
import { getDb } from '../db.js';
import { requireDM, requireCampaign } from '../auth.js';

const router = Router();

function multiplierKey(campaignId) {
  return `campaign_${campaignId}_price_multiplier`;
}

router.get('/settings', requireDM, requireCampaign, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT value FROM dm_settings WHERE key = ?').get(multiplierKey(req.campaignId));
  res.json({ price_multiplier: row?.value ?? '1.0' });
});

router.put('/settings', requireDM, requireCampaign, (req, res) => {
  const { price_multiplier } = req.body;
  const db = getDb();

  if (price_multiplier !== undefined) {
    const val = parseFloat(price_multiplier);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: 'price_multiplier must be a positive number' });
    }
    db.prepare('INSERT OR REPLACE INTO dm_settings (key, value) VALUES (?, ?)')
      .run(multiplierKey(req.campaignId), String(val));
  }

  const row = db.prepare('SELECT value FROM dm_settings WHERE key = ?').get(multiplierKey(req.campaignId));
  res.json({ price_multiplier: row?.value ?? '1.0' });
});

export default router;
