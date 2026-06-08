import { Router } from 'express';
import { getDb } from '../db.js';
import { requireDM } from '../auth.js';

const router = Router();

router.get('/settings', requireDM, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM dm_settings').all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json(settings);
});

router.put('/settings', requireDM, (req, res) => {
  const { price_multiplier } = req.body;
  const db = getDb();

  if (price_multiplier !== undefined) {
    const val = parseFloat(price_multiplier);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: 'price_multiplier must be a positive number' });
    }
    db.prepare("INSERT OR REPLACE INTO dm_settings (key, value) VALUES ('price_multiplier', ?)")
      .run(String(val));
  }

  const rows = db.prepare('SELECT key, value FROM dm_settings').all();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

export default router;
